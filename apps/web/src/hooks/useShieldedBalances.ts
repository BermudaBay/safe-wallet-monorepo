import { useMemo } from 'react'
import useAsync from '@safe-global/utils/hooks/useAsync'
import useSafeInfo from '@/hooks/useSafeInfo'
import { loadShieldedBalances } from '@/on-chain-data/load-safe-sheilded-balances'
import { type Balances } from '@safe-global/store/gateway/AUTO_GENERATED/balances'

const EMPTY_BALANCES: Balances = {
  fiatTotal: '0',
  items: [],
}

export const useShieldedBalances = (): {
  balances: Balances
  loaded: boolean
  loading: boolean
  error?: string
} => {
  const { safe, safeAddress } = useSafeInfo()
  const chainId = Number(safe.chainId)

  const [balances, error, loading] = useAsync<Balances>(
    async () => {
      if (!safeAddress || !chainId) {
        return EMPTY_BALANCES
      }
      const keypairSeed = BigInt(12345)
      try {
        return await loadShieldedBalances(chainId, keypairSeed, safeAddress)
      } catch (err) {
        console.error('[Shielded Balances] Error loading shielded balances:', err)
        throw err
      }
    },
    [safeAddress, chainId],
    false,
  )

  return useMemo(
    () => ({
      balances: balances || EMPTY_BALANCES,
      error: error?.message,
      loaded: !loading && !!balances,
      loading,
    }),
    [balances, error, loading],
  )
}
