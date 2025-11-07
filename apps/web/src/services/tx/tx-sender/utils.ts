import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import { SafeTransactionData } from '@safe-global/types-kit'
import { Contract, Interface, getBytes, Signer } from 'ethers'

export async function getSafeTxHash(safeAddress: string, safeTxData: SafeTransactionData): Promise<string> {
    const bermudaSDK = getBermudaSDK()
    const safeContract = new Contract(
        safeAddress,
        bermudaSDK.abis.SAFE_ABI,
        { provider: bermudaSDK.config.provider }
    )
    return safeContract.getTransactionHash(
        safeTxData.to,
        safeTxData.value,
        safeTxData.data,
        safeTxData.operation,
        safeTxData.safeTxGas,
        safeTxData.baseGas,
        safeTxData.gasPrice,
        safeTxData.gasToken,
        safeTxData.refundReceiver,
        safeTxData.nonce
    )
}

// DEPRECATED: This function used raw message signing instead of EIP-712 typed data.
// All signing now uses bermudaSDK.safe.signSafeTxHash() which implements EIP-712.
// export async function getAdjustedSignature(signer: Signer, safeTxHash: string): Promise<string> {
//     let sig = await signer.signMessage(getBytes(safeTxHash))
//     let v = Number(`0x${sig.slice(-2)}`)
//     if (v === 27 || v === 28) {
//         sig = sig.slice(0, -2) + (v + 4).toString(16)
//     }
//     return sig
// }

export async function getConfirmPayload(
    safeAddress: string,
    safeTxHash: string,
    signer: Signer,
): Promise<{ to: string; data: string }> {

  const bermudaSDK = getBermudaSDK()

  const chainIdHex = await provider.request({ method: 'eth_chainId' })
  const chainIdBigInt = BigInt(chainIdHex as string)

  const signature = await bermudaSDK.safe.utils.signSafeTx(signer, safeAddress, safeTxData, chainIdBigInt, provider)

    const proposeTxLib = bermudaSDK.config.proposeTxLib
    if (!proposeTxLib) {
        throw new Error('ProposeTxLib address not configured')
    }

    const iface = Interface.from(bermudaSDK.abis.PROPOSE_TX_LIB_ABI)

    return {
        to: proposeTxLib,
        data: iface.encodeFunctionData('confirm', [safeAddress, safeTxHash, signature]),
    }
}
