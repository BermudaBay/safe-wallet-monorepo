import { getBermudaSDK } from "@/hooks/bermudaSDK/useBermudaSDK"
import { SafeTransactionData } from "@safe-global/types-kit"
import { Contract, getBytes, Signer } from "ethers"

export async function getSafeTxHash(safeAddress: string, safeTxData: SafeTransactionData) {
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

export async function getAdjustedSignature(signer: Signer, safeTxHash: string): Promise<string> {
    let sig = await signer.signMessage(getBytes(safeTxHash))
    let v = Number(`0x${sig.slice(-2)}`)
    if (v === 27 || v === 28) {
        sig = sig.slice(0, -2) + (v + 4).toString(16)
    }
    return sig
}