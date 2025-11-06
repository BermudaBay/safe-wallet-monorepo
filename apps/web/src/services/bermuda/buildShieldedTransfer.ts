import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import type { MetaTransactionData } from '@safe-global/types-kit'
import { safeParseUnits } from '@safe-global/utils/utils/formatters'
import { Interface, ZeroAddress } from 'ethers'
import { OperationType } from '@safe-global/types-kit'
import type { BatchSafeTx } from '@/services/tx/tx-sender/dispatch'

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

    const poolAddress = await bermudaSDK.config.pool.getAddress()
    const normalizedToken = tokenAddress.toLowerCase()
    const parsedAmount = safeParseUnits(amount, tokenDecimals)

    if (parsedAmount === undefined) throw new Error('Invalid shielded deposit amount')

    // Select UTXOs up to amount
    const utxos = await bermudaSDK.utils
        .findUtxosUpTo({
            pool: bermudaSDK.config.pool,
            keypair: shieldedKeyPair,
            token: normalizedToken,
            amount: parsedAmount
        })

    // Calculate the stx hash using the selected UTXOs, given recipient, and additional data
    const otherPubKey = BigInt(shieldedAddress.slice(0, 66))
    const ownPubKey = BigInt(shieldedKeyPair.address().slice(0, 66))
    const otherAmount = parsedAmount
    const ownAmount = bermudaSDK.utils.sumAmounts(utxos) - parsedAmount
    const stx = {
        token: tokenAddress,
        safe: safeAddress,
        inputNullifiers: utxos.map((u: any) => u.getNullifier()),
        amounts: utxos.map((u: any) => u.amount),
        recipient: ZeroAddress,
        outputPubkeys: [otherPubKey, ownPubKey],
        outputAmounts: [otherAmount, ownAmount]
    }
    const stxHash = bermudaSDK.safe.stxHash(stx)

    // Encrypt the stx hash preimage and publish it
    const encodedStx = bermudaSDK.utils.encodeStx(stx)
    const encryptionKey = bermudaSDK.utils.bigint2bytes(shieldedKeyPair.privkey)
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
