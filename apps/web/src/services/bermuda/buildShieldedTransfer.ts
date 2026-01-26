import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import type { MetaTransactionData } from '@safe-global/types-kit'
import { safeParseUnits } from '@safe-global/utils/utils/formatters'
import { Interface, toUtf8Bytes, ZeroAddress } from 'ethers'
import { OperationType } from '@safe-global/types-kit'
import type { BatchSafeTx } from '@/services/tx/tx-sender/dispatch'
import { simpleEncodeStx } from './utils'

type BuildShieldedTransferArgs = {
    safeAddress: string
    shieldedAddress: string
    tokenAddress: string
    tokenDecimals: number
    amount: string
    shieldedKeyPair: any
}

export const buildShieldedTransferMetaTxs = async ({
    safeAddress,
    shieldedAddress,
    tokenAddress,
    tokenDecimals,
    amount,
    shieldedKeyPair,
}: BuildShieldedTransferArgs): Promise<{ metaTxs: MetaTransactionData[]; batchSafeTxs: BatchSafeTx[]; viewingKey?: string }> => {
    console.info('[ShieldedAssetTransfer][Builder] Preparing shielded transfer meta txs', {
        safeAddress,
        shieldedAddress,
        tokenAddress,
        tokenDecimals,
        amount,
    })

    const bermudaSDK = getBermudaSDK()
    if (!bermudaSDK) throw new Error('Bermuda SDK not initialized')
    if (!bermudaSDK.config.pool) throw new Error('Bermuda pool contract not configured')
    if (!shieldedAddress) throw new Error('Missing shielded address')

    const normalizedToken = tokenAddress.toLowerCase()
    const parsedAmount = safeParseUnits(amount, tokenDecimals)

    if (parsedAmount === undefined) throw new Error('Invalid shielded deposit amount')

    // Select UTXOs up to amount
    let utxos = await bermudaSDK.utils
        .findUtxos({
            pool: bermudaSDK.config.pool,
            keypair: shieldedKeyPair,
            peers: [
                /*empty since we won't need to decrypt stx history, i.e. historical, spent UTXOs*/
            ],
            tokens: [normalizedToken],
            excludeSpent: true,
            excludeOthers: true,
            from: bermudaSDK.config.startBlock,
        })

    utxos = utxos[normalizedToken]

    console.log("$$$$$ utxos", utxos.length, utxos)

    while (utxos.length !== 2 && utxos.length < 16) {
        utxos.push(
            new bermudaSDK.types.Utxo({
                token: normalizedToken,
                safe: safeAddress,
                amount: 0n,
                keypair: shieldedKeyPair,
                blinding: 0n
            })
        )
    }

    // In-place desc sort
    utxos.sort((a: any, b: any) => Number(b.amount - a.amount))
    // Max inputs are 16
    utxos = utxos.slice(0, 16)

    // Calculate the stx hash using the selected UTXOs, given recipient, and additional data
    const sumIns = bermudaSDK.utils.sumAmounts(utxos)
    console.log({ sumIns, parsedAmount })
    if (sumIns < parsedAmount) throw Error("Shielded balance not sufficient")

    const otherPubKey = BigInt(shieldedAddress.slice(0, 66))
    const ownPubKey = BigInt(shieldedKeyPair.address().slice(0, 66))
    const otherAmount = parsedAmount
    const ownAmount = sumIns - parsedAmount
    const safeToExternal = sumIns - (otherAmount + ownAmount)
    const spendingLimit = safeToExternal > 0n ? safeToExternal : 0n
    const stx = {
        token: tokenAddress,
        safe: safeAddress,
        inputNullifiers: utxos.map((u: any) => u.getNullifier()),
        amounts: utxos.map((u: any) => u.amount),
        spendingLimit,
        recipient: ZeroAddress,
        outputPubkeys: [otherPubKey, ownPubKey],
        outputAmounts: [otherAmount, ownAmount]
    }
    console.log('build shielded tx inout ', stx)
    const stxHash = bermudaSDK.safe.stxHash(stx)
    console.log("$$$$$$$$$ buildShieldedTransferMetaTxs stxHash", stxHash)
    // Encrypt the stx hash preimage and publish it
    // const encodedStx = bermudaSDK.utils.encodeStx(stx)
    const encodedStx = simpleEncodeStx(stx)
    const encryptionKey = shieldedKeyPair.x25519.secretKey
    const encryptedStx = bermudaSDK.utils.encryptMessageCiphertext(encryptionKey, encodedStx).payload
    const topic = bermudaSDK.utils.calcMessageCiphertextTopic({
        chainId: bermudaSDK.config.chainId,
        safeAddress,
        secretKey: encryptionKey
    })

    await bermudaSDK.utils.relay(bermudaSDK.config.relayer, {
        chainId: bermudaSDK.config.chainId,
        target: bermudaSDK.config.signMsgHashLib,
        data: Interface.from(bermudaSDK.abis.SIGN_MESSAGE_HASH_LIB_ABI)
            .encodeFunctionData("messageCiphertext", [topic, encryptedStx])
    })

    // Propose SignMsgHashLib.signMessageHash(stxHash) via ProposeTxLib.propose()
    const safeTx = {
        to: bermudaSDK.config.signMsgHashLib,
        data: Interface.from(bermudaSDK.abis.SIGN_MESSAGE_HASH_LIB_ABI)
            .encodeFunctionData('signMessageHash', [stxHash]),
        operation: OperationType.DelegateCall,
        value: '0'
    }

    return { metaTxs: [safeTx], batchSafeTxs: [], viewingKey: undefined }
}


// amounts
// : 
// (2) ['0x0000000000000000000000000000000000000000000000008ac7230489e80000', '0x0000000000000000000000000000000000000000000000000000000000000000']
// inputNullifiers
// : 
// (2) ['0x1c2b7eba7456e737dbb408dcbb3a004359f3d6fd83be4bf387b47122b4973f2a', '0x01b0eee867cc9e43819afb3a46240994895a41107382b28785d97844e6453b37']
// outputAmounts
// : 
// (2) ['0x0000000000000000000000000000000000000000000000000de0b6b3a7640000', '0x0000000000000000000000000000000000000000000000007ce66c50e2840000']
// outputPubkeys
// : 
// (2) ['0x2f6eee1e3ac3c6c9b6731de3137e4687da7e21af6ccbeeac48b53f064a87a033', '0x1df73019e1884ce08452d49a7ac5d2bcb18e7bf9f60c9742c4ccc7201a0eff91']
// recipient
// : 
// "0x0000000000000000000000000000000000000000"
// safe
// : 
// "0xF911c4e102e824D55d4a6401D8a1D83e4147B472"
// spendingLimit
// : 
// "0x0de0b6b3a7640000"
// token
// : 
// "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9"


// // 
// amounts
// : 
// (2) [10000000000000000000n, 0n]
// inputNullifiers
// : 
// (2) [12741608830958680836532343990829957777548859390747883121693728816511833292586n, 764926813253766057749322345715035105129794481439556905290317261879013358391n]
// outputAmounts
// : 
// (2) [1000000000000000000n, 9000000000000000000n]
// outputPubkeys
// : 
// (2) [21454700491156729402350592290519638367690840096899170254002005269222494019635n, 13553815815489635135042271451842668676601663767946067211312276338639939501969n]
// recipient
// : 
// "0x0000000000000000000000000000000000000000"
// safe
// : 
// "0xF911c4e102e824D55d4a6401D8a1D83e4147B472"
// spendingLimit
// : 
// 0n
// token
// : 
// "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9"