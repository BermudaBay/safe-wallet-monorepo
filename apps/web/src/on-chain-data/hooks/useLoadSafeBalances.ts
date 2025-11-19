import { useState, useEffect } from 'react'
import loadSafeBalances from '../load-safe-balances'
import { type Balances } from '@safe-global/store/gateway/AUTO_GENERATED/balances'

// Should be no less than 5 seconds to not overwhelm the RPC endpoint as we're
// fetching asset prices via Chainlink Mainnet contracts.
const REFETCH_INTERVAL = 5_000

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
      const id = setInterval(() => {
        load(address)
      }, REFETCH_INTERVAL)

      return () => clearInterval(id)
    }
  }, [address])

  return { data, isLoading, error }
}
