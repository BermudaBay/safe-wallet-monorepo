import { useState, useEffect } from 'react'
import loadSafeBalances from '../load-safe-balances'
import { type Balances } from '@safe-global/store/gateway/AUTO_GENERATED/balances'

export default function useLoadSafeBalances(chainId: number, address: string) {
  const [error, setError] = useState<Error>()
  const [data, setData] = useState<Balances>()
  const [isLoading, setIsLoading] = useState<boolean>(false)

  async function load(address: string) {
    setIsLoading(true)

    try {
      const balances = await loadSafeBalances(chainId, address)
      setData(balances)
    } catch (error: unknown) {
      setError(error as Error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (address) {
      load(address)
    }
  }, [address])

  return { data, isLoading, error }
}
