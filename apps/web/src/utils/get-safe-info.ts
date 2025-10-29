import getInfoViaChain from '@/on-chain-data/load-safe-info'
import { getSafeInfo as getInfoViaApi, SafeInfo } from '@safe-global/safe-gateway-typescript-sdk'

export async function getSafeInfo(chainId: string, address: string): Promise<SafeInfo> {
  // Try to load Safe info via the official API.
  try {
    // Await promise so we can use try catch when it's rejected.
    const result = await getInfoViaApi(chainId, address)
    return result
  } catch {}

  // Try to load Safe info via on-chain data fetching.
  try {
    // Await promise so we can use try catch when it's rejected.
    const result = await getInfoViaChain(Number(chainId), address)
    return result
  } catch {}

  // Throw error if no Safe info can be found.
  throw new Error(`Safe information for Safe with address ${address} on chain ${chainId} not found`)
}
