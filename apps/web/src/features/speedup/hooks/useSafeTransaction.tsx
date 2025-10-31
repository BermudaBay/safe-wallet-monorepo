// import { useSafeSDK } from '@/hooks/coreSDK/safeCoreSDK'
import { useBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import useChainId from '@/hooks/useChainId'
import { useEffect, useState } from 'react'
import type { SafeTransaction } from '@safe-global/types-kit'
import { createExistingTx } from '@/services/tx/tx-sender'

export const useSafeTransaction = (txId: string) => {
  // const safeSdk = useSafeSDK()
  const bermudaSDK = useBermudaSDK()
  const chainId = useChainId()
  const [safeTx, setSafeTx] = useState<SafeTransaction>()

  useEffect(() => {
    // if (!safeSdk) {
    if (!bermudaSDK) {
      return
    }
    createExistingTx(chainId, txId).then(setSafeTx)
    // }, [chainId, txId, safeSdk])
  }, [chainId, txId, bermudaSDK])

  return safeTx
}
