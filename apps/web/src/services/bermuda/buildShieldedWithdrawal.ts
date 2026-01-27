import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import type { MetaTransactionData } from '@safe-global/types-kit'
import { safeParseUnits } from '@safe-global/utils/utils/formatters'
import { Interface, toUtf8Bytes, ZeroAddress } from 'ethers'
import { OperationType } from '@safe-global/types-kit'
import type { BatchSafeTx } from '@/services/tx/tx-sender/dispatch'
import { simpleEncodeStx } from './utils'

type BuildShieldedWithdrawalArgs = {
    safeAddress: string
    // shieldedAddress: string
    nativeAddress: string
    tokenAddress: string
    tokenDecimals: number
    amount: string
    shieldedKeyPair: any
}

export const buildShieldedWithdrawalMetaTxs = async ({
    safeAddress,
    // shieldedAddress,
    nativeAddress,
    tokenAddress,
    tokenDecimals,
    amount,
    shieldedKeyPair,
}: BuildShieldedWithdrawalArgs): Promise<{ metaTxs: MetaTransactionData[]; batchSafeTxs: BatchSafeTx[]; viewingKey?: string }> => {
    console.info('[ShieldedAssetWithdrawal][Builder] Preparing shielded withdrawal meta txs', {
        safeAddress,
        nativeAddress,
        tokenAddress,
        tokenDecimals,
        amount,
    })

    const bermudaSDK = getBermudaSDK()
    if (!bermudaSDK) throw new Error('Bermuda SDK not initialized')
    if (!bermudaSDK.config.pool) throw new Error('Bermuda pool contract not configured')
    if (!nativeAddress) throw new Error('Missing native address')

    const normalizedToken = tokenAddress.toLowerCase()
    const parsedAmount = safeParseUnits(amount, tokenDecimals)

    if (parsedAmount === undefined) throw new Error('Invalid shielded withdrawal amount')

    // Select UTXOs up to amount
    let utxos = await bermudaSDK.utils
        .findUtxosUpTo({
            pool: bermudaSDK.config.pool,
            keypair: shieldedKeyPair,
            peers: [
                /*empty since we won't need to decrypt stx history, i.e. historical, spent UTXOs*/
            ],
            token: normalizedToken,
            excludeSpent: true,
            excludeOthers: true,
            from: bermudaSDK.config.startBlock,
            amount: parsedAmount 
        })


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

    // const otherPubKey = BigInt(shieldedAddress.slice(0, 66))
    const ownPubKey = BigInt(shieldedKeyPair.address().slice(0, 66))
    // const otherAmount = parsedAmount
    const ownAmount = sumIns - parsedAmount
    const stx = {
        token: tokenAddress,
        safe: safeAddress,
        inputNullifiers: utxos.map((u: any) => u.getNullifier()),
        amounts: utxos.map((u: any) => u.amount),
        spendingLimit: parsedAmount,
        recipient: nativeAddress,
        // outputPubkeys: [otherPubKey, ownPubKey],
        outputPubkeys: [ownPubKey, ownPubKey],
        // outputAmounts: [otherAmount, ownAmount]
        outputAmounts: [0n, ownAmount]
    }
    console.log("$$$$$$ build withdrawal stx preimage", stx)
    const stxHash = bermudaSDK.safe.stxHash(stx)
    console.log("$$$$$$$$$ buildShieldedWithdrawalMetaTxs stxHash", stxHash)
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
