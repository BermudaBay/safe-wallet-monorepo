import { useEffect, useState } from 'react'
import loadSafeInfo from '../load-safe-info'
import { useBermuda } from '@/contexts/bermuda-context'
import { toTransactionDetails } from '@/services/bermuda/txMapper'
import { type TransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'

export default function useLoadTransactionDetails(chainId: number, address: string, transactionId?: string) {
  const { sdk } = useBermuda()
  const [error, setError] = useState<Error>()
  const [data, setData] = useState<TransactionDetails>()
  const [isLoading, setIsLoading] = useState<boolean>(false)

  async function load(transactionId: string) {
    setIsLoading(true)

    try {
      const { owners, threshold } = await loadSafeInfo(chainId, address)

      let txHash = transactionId
      if (txHash.startsWith('multisig')) {
        txHash = transactionId.split('_').pop()!
      }

      const { all } = await sdk.safe.listTxs(address)
      const transaction = all.find((item: any) => item.hash.toLowerCase() === txHash.toLowerCase())

      const entry = {
        safeAddress: address,
        info: transaction,
        timestamp: Date.now(),
      }

      const details = toTransactionDetails(entry, owners, threshold)

      setData(details)
    } catch (error: unknown) {
      setError(error as Error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (sdk && transactionId) {
      load(transactionId)
    }
  }, [sdk, transactionId])

  return { data, isLoading, error }
}
