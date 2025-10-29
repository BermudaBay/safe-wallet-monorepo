import { useState, useEffect } from 'react'
import loadSafeOverview from '../load-safe-overview'
import { type SafeOverview } from '@safe-global/store/gateway/AUTO_GENERATED/safes'

export default function useLoadSafeOverview(chainId: number, address: string) {
  const [error, setError] = useState<Error>()
  const [data, setData] = useState<SafeOverview>()
  const [isLoading, setIsLoading] = useState<boolean>(false)

  async function load(address: string) {
    setIsLoading(true)

    try {
      const overview = await loadSafeOverview(chainId, address)
      setData(overview)
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
