import loadSafeBalances from './load-safe-balances'
import loadSafeInfo from './load-safe-info'
import { type SafeOverview } from '@safe-global/store/gateway/AUTO_GENERATED/safes'

export default async function loadSafeOverview(chainId: number, address: string): Promise<SafeOverview> {
  const info = await loadSafeInfo(chainId, address)
  const balances = await loadSafeBalances(chainId, address)

  const result: SafeOverview = {
    address: {
      value: address,
    },
    chainId: String(chainId),
    threshold: info.threshold,
    owners: info.owners,
    fiatTotal: balances.fiatTotal,
    // TODO: Read queued from chain.
    queued: 0,
    // TODO: Read awaitingConfirmation from chain.
    awaitingConfirmation: null,
  }

  return result
}
