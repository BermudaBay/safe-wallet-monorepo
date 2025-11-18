import { useContext, useEffect, useState } from 'react'
import type { AddressEx, TransactionListPage } from '@safe-global/safe-gateway-typescript-sdk'
import useAsync, { type AsyncResult } from '@safe-global/utils/hooks/useAsync'
import useSafeInfo from '../useSafeInfo'
import { Errors, logError } from '@/services/exceptions'
import { TxEvent, txSubscribe } from '@/services/tx/txEvents'
import { useBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import { mapSdkQueueToTransactionPage } from '@/services/bermuda/txMapper'
import useWallet from '@/hooks/wallets/useWallet'
import type { SdkListTxsResult } from '@/services/bermuda/types'
import { STXType, useBermuda } from '@/contexts/bermuda-context'
import { TxModalContext } from '@/components/tx-flow'

export const useLoadTxQueue = (): AsyncResult<TransactionListPage> => {
  const { safe, safeAddress, safeLoaded } = useSafeInfo()
  const { chainId, txQueuedTag, txHistoryTag } = safe
  const [updatedTxId, setUpdatedTxId] = useState<string>('')
  const bermudaSDK = useBermudaSDK()
  const { isStxExecuted, stxType } = useBermuda()
  const wallet = useWallet()
  // N.B. we reload when txQueuedTag/txHistoryTag/updatedTxId changes as txQueuedTag alone is not enough
  const reloadTag = (txQueuedTag ?? '') + (txHistoryTag ?? '') + updatedTxId

  const { txFlow } = useContext(TxModalContext)

  // Re-fetch when chainId/address, or txQueueTag change
  const [data, error, loading] = useAsync<TransactionListPage>(
    () => {
      if (!safeLoaded) return
      if (!safe.deployed) return Promise.resolve({ results: [] })
      if (!bermudaSDK) return

      const owner = wallet?.address?.toLowerCase()
      const owners: AddressEx[] = (safe.owners || []).map((address) => ({
        value: address.value,
        name: address.name ?? undefined,
        logoUri: address.logoUri ?? undefined,
      }))

      const latestStxType = stxType ?? STXType.Undefined

      return bermudaSDK.safe.listTxs(safeAddress, owner).then((result: unknown) => {
        const { all, pending } = result as SdkListTxsResult
        // const { keyPair, sdk, saveStxExecuted, isStxExecuted } = useBermuda()
        return mapSdkQueueToTransactionPage({
          safeAddress,
          allTxs: all,
          owners,
          threshold: safe.threshold,
        }, isStxExecuted, latestStxType)
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [safeLoaded, chainId, safeAddress, reloadTag, safe.deployed, bermudaSDK, wallet?.address, txFlow],
    false,
  )

  // Track proposed and deleted txs so that we can reload the queue
  useEffect(() => {
    const unsubscribeProposed = txSubscribe(TxEvent.PROPOSED, ({ txId }) => {
      setUpdatedTxId(txId)
    })
    const unsubscribeDeleted = txSubscribe(TxEvent.DELETED, ({ safeTxHash }) => {
      setUpdatedTxId(safeTxHash)
    })
    const unsubscribeSignatureIndexed = txSubscribe(TxEvent.SIGNATURE_INDEXED, ({ txId }) => {
      setUpdatedTxId(txId)
    })
    const unsubscribeOnChainSignature = txSubscribe(TxEvent.ONCHAIN_SIGNATURE_SUCCESS, ({ txId }) => {
      if (txId) {
        setUpdatedTxId(txId)
      }
    })
    const unsubscribeProcessed = txSubscribe(TxEvent.PROCESSED, ({ txId }) => {
      if (txId) {
        setUpdatedTxId(txId)
      }
    })
    return () => {
      unsubscribeProposed()
      unsubscribeDeleted()
      unsubscribeSignatureIndexed()
      unsubscribeOnChainSignature()
      unsubscribeProcessed()
    }
  }, [])

  // Log errors
  useEffect(() => {
    if (!error) return
    logError(Errors._603, error.message)
  }, [error])

  return [data, error, loading]
}

export default useLoadTxQueue
