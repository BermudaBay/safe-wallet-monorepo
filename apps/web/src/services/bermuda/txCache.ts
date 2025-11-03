import type { SdkSafeTxInfo } from './types'

export type CachedSdkTx = {
  safeAddress: string
  info: SdkSafeTxInfo
  timestamp: number
}

const sdkTxCache = new Map<string, CachedSdkTx>()

export const setSdkQueuedTx = (txId: string, value: CachedSdkTx) => {
  sdkTxCache.set(txId, value)
}

export const getSdkQueuedTx = (txId: string) => {
  return sdkTxCache.get(txId)
}

export const clearSdkQueuedTxs = () => {
  sdkTxCache.clear()
}
