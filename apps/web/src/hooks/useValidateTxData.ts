import { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import { useBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import useAsync from '@safe-global/utils/hooks/useAsync'
import { logError } from '@/services/exceptions'
import ErrorCodes from '@safe-global/utils/services/exceptions/ErrorCodes'
import { Contract, ethers } from 'ethers'
import { useContext } from 'react'
import useSafeInfo from '@/hooks/useSafeInfo'

export const useValidateTxData = (txId?: string) => {
  const { safeTx } = useContext(SafeTxContext)

  const bermudaSDK = useBermudaSDK()
  const { safeAddress } = useSafeInfo()

  return useAsync(async () => {
    if (!bermudaSDK || !safeTx) {
      return
    }

    // Validate hash
    const safeContract = new Contract(
      safeAddress,
      bermudaSDK.abis.SAFE_ABI,
      { provider: bermudaSDK.config.provider }
    )

    const computedSafeTxHash = await safeContract.getTransactionHash(
      safeTx.data.to,
      safeTx.data.value,
      safeTx.data.data,
      safeTx.data.operation,
      safeTx.data.safeTxGas,
      safeTx.data.baseGas,
      safeTx.data.gasPrice,
      safeTx.data.gasToken,
      safeTx.data.refundReceiver,
      safeTx.data.nonce
    )

    if (txId && txId.slice(-66) !== computedSafeTxHash) {
      return 'The transaction data does not match its safeTxHash'
    }

    // Validate non 1271 signatures
    for (const signature of safeTx.signatures.values()) {
      if (signature.isContractSignature) {
        continue
      }

      const sig = signature.staticPart()
      const v = parseInt(sig.slice(-2), 16)

      if (v === 0 || v === 1) {
        // We ignore pre-validated sigs and EIP1271 for now
        continue
      }
      // ECDSA signature
      if (v === 27 || v === 28) {
        try {
          const recoveredAddress = ethers.recoverAddress(computedSafeTxHash, sig)
          if (recoveredAddress !== signature.signer) {
            return `The signature for the signer ${signature.signer} is invalid`
          }
        } catch (e) {
          logError(ErrorCodes._818, e)
          return `The signature for the signer ${signature.signer} could not be validated`
        }
      }
      // ETH_SIGN signature
      if (v === 31 || v === 32) {
        try {
          const modifiedSig = `${sig.slice(0, -2)}${(v - 4).toString(16)}`
          const recoveredAddress = ethers.verifyMessage(ethers.getBytes(computedSafeTxHash), modifiedSig)
          if (recoveredAddress !== signature.signer) {
            return `The signature for the signer ${signature.signer} is invalid`
          }
        } catch (e) {
          logError(ErrorCodes._818, e)
          return `The signature for the signer ${signature.signer} could not be validated`
        }
      }
    }
  }, [bermudaSDK, safeTx, txId])
}
