import { useMemo } from 'react'
import useAsync from '@safe-global/utils/hooks/useAsync'
import useSafeInfo from '@/hooks/useSafeInfo'
import { useBermuda } from '@/contexts/bermuda-context'
import { loadShieldedBalances } from '@/on-chain-data/load-safe-sheilded-balances'
import { type Balances } from '@safe-global/store/gateway/AUTO_GENERATED/balances'
import { useBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'

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
  const { keyPair } = useBermuda()
  const chainId = Number(safe.chainId)
  const sdk = useBermudaSDK()

  const [balances, error, loading] = useAsync<Balances>(
    async () => {
      if (!safeAddress || !chainId || !keyPair) {
        return EMPTY_BALANCES
      }
      try {
        return await loadShieldedBalances(chainId, keyPair, safeAddress)
      } catch (err) {
        console.error('[Shielded Balances] Error loading shielded balances:', err)
        throw err
      }
    },
    [safeAddress, chainId, keyPair],
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

export function hasShieldedBalance() {
  const { sdk } = useBermuda()

  const shieldedBalances = useShieldedBalances()

  let hasShieldedAssets = false

  if (shieldedBalances && sdk) {
    const mockUSDCAddress = sdk.config.mockUSDC.toLowerCase()
    const mockWETHAddress = sdk.config.mockWETH.toLowerCase()

    const total = shieldedBalances.balances.items.reduce((accum, item) => {
      const tokenAddress = item.tokenInfo.address.toLowerCase()

      if (tokenAddress === mockUSDCAddress || tokenAddress === mockWETHAddress) {
        return (accum += Number(item.balance))
      }

      return accum
    }, 0)

    hasShieldedAssets = !!total
  }

  return hasShieldedAssets
}
