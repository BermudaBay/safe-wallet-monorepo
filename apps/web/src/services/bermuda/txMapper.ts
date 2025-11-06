import type { SdkSafeTxInfo } from './types'
import type { AddressEx, Transaction, TransactionDetails, TransactionListPage } from '@safe-global/safe-gateway-typescript-sdk'
import {
  ConflictType,
  DetailedExecutionInfoType,
  Operation,
  TransactionInfoType,
  TransactionListItemType,
  TransactionStatus,
} from '@safe-global/safe-gateway-typescript-sdk'
import { clearSdkQueuedTxs, getSdkQueuedTx, setSdkQueuedTx, type CachedSdkTx } from './txCache'

type MapArgs = {
  safeAddress: string
  pendingTxs: SdkSafeTxInfo[]
  owners: AddressEx[]
  threshold: number
}

const buildTxId = (safeAddress: string, info: SdkSafeTxInfo): string => {
  return `multisig_${safeAddress.toLowerCase()}_${info.hash}`
}

const getStatus = (info: SdkSafeTxInfo, threshold: number) => {
  const confirmationsSubmitted = Object.keys(info.signatures).length
  const confirmationsRequired = Number(threshold) || 0

  let txStatus = TransactionStatus.AWAITING_CONFIRMATIONS
  if (info.executed) {
    txStatus = TransactionStatus.SUCCESS
  } else if (confirmationsRequired > 0 && confirmationsSubmitted >= confirmationsRequired) {
    txStatus = TransactionStatus.AWAITING_EXECUTION
  }

  return { confirmationsRequired, confirmationsSubmitted, txStatus }
}

const toCustomTxInfo = (info: SdkSafeTxInfo): Transaction['transaction']['txInfo'] => {
  const dataSize = info.details.data ? Math.max(0, (info.details.data.length - 2) / 2) : 0

  return {
    type: TransactionInfoType.CUSTOM,
    to: { value: info.details.to },
    dataSize: dataSize.toString(),
    value: info.details.value.toString(),
    isCancellation: false,
    methodName: 'Custom transaction',
  }
}

const toTransaction = (
  cacheEntry: CachedSdkTx,
  owners: AddressEx[],
  threshold: number,
): Transaction => {
  const { info, safeAddress, timestamp } = cacheEntry
  const { confirmationsRequired, confirmationsSubmitted, txStatus } = getStatus(info, threshold)
  const signedAddresses = new Set(Object.keys(info.signatures).map((address) => address.toLowerCase()))

  const missingSigners = owners.filter((owner) => {
    return !signedAddresses.has(owner.value.toLowerCase())
  })

  return {
    type: TransactionListItemType.TRANSACTION,
    conflictType: ConflictType.NONE,
    transaction: {
      id: buildTxId(safeAddress, info),
      timestamp,
      txStatus,
      txInfo: toCustomTxInfo(info),
      txHash: null,
      executionInfo: {
        type: DetailedExecutionInfoType.MULTISIG,
        nonce: Number(info.details.nonce),
        confirmationsRequired,
        confirmationsSubmitted,
        missingSigners: missingSigners.length ? missingSigners : undefined,
      },
    },
  }
}

export const toTransactionDetails = (
  cacheEntry: CachedSdkTx,
  owners: AddressEx[],
  threshold: number,
): TransactionDetails => {
  const { info, safeAddress, timestamp } = cacheEntry
  const { confirmationsRequired, confirmationsSubmitted, txStatus } = getStatus(info, threshold)

  const confirmations = Object.entries(info.signatures).map(([signerAddress, signature]) => {
    const signer =
      owners.find((owner) => owner.value.toLowerCase() === signerAddress.toLowerCase()) ??
      ({ value: signerAddress } as AddressEx)

    return {
      signer,
      signature,
      submittedAt: timestamp,
    }
  })

  return {
    safeAddress,
    txId: buildTxId(safeAddress, info),
    txStatus,
    txInfo: toCustomTxInfo(info),
    txData: {
      hexData: info.details.data,
      to: { value: info.details.to },
      value: info.details.value.toString(),
      operation: info.details.operation as Operation,
      trustedDelegateCallTarget: true,
    },
    detailedExecutionInfo: {
      type: DetailedExecutionInfoType.MULTISIG,
      submittedAt: timestamp,
      nonce: Number(info.details.nonce),
      safeTxGas: info.details.safeTxGas.toString(),
      baseGas: info.details.baseGas.toString(),
      gasPrice: info.details.gasPrice.toString(),
      gasToken: info.details.gasToken,
      refundReceiver: { value: info.details.refundReceiver },
      safeTxHash: info.hash,
      confirmationsRequired,
      confirmations,
      signers: owners,
      trusted: true,
      proposer: null,
      proposedByDelegate: null,
    },
  }
}

export const mapSdkQueueToTransactionPage = ({ safeAddress, pendingTxs, owners, threshold }: MapArgs): TransactionListPage => {
  clearSdkQueuedTxs()

  const sorted = [...pendingTxs].sort((a, b) => Number(a.details.nonce) - Number(b.details.nonce))
  const now = Date.now()

  const results = sorted.map((info, index) => {
    const timestamp = now - index
    const cacheEntry: CachedSdkTx = { safeAddress, info, timestamp }
    const txId = buildTxId(safeAddress, info)
    setSdkQueuedTx(txId, cacheEntry)
    return toTransaction(cacheEntry, owners, threshold)
  })

  return { results }
}

export const getCachedTransactionDetails = (
  txId: string,
  owners: AddressEx[],
  threshold: number,
): TransactionDetails | undefined => {
  const cached = getSdkQueuedTx(txId)
  if (!cached) {
    return undefined
  }

  return toTransactionDetails(cached, owners, threshold)
}
