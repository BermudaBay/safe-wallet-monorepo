import { useState, useEffect } from 'react'
import loadSafeOverview from '../load-safe-overview'
import { type SafeOverview } from '@safe-global/store/gateway/AUTO_GENERATED/safes'

export default function useLoadSafeOverviews(chainId: number, addresses: string[]) {
  const [error, setError] = useState<Error>()
  const [data, setData] = useState<SafeOverview[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  async function load(addresses: string[]) {
    setIsLoading(true)

    try {
      const promises = addresses.map((address) => loadSafeOverview(chainId, address))
      const overviews = await Promise.all(promises)
      setData(overviews)
    } catch (error: unknown) {
      setError(error as Error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (addresses.length) {
      load(addresses)
    }
  }, [addresses])

  return { data, isLoading, error }
}
