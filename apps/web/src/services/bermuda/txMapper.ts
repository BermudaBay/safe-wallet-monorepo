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
import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import { hexlify, Interface, toBeHex, ZeroAddress } from 'ethers'
import { STXType } from '@/contexts/bermuda-context'

type MapArgs = {
  safeAddress: string
  allTxs: SdkSafeTxInfo[]
  owners: AddressEx[]
  threshold: number
}

export function getTxHash(txId: string) {
  let txHash = txId

  if (txHash.startsWith('multisig')) {
    txHash = txId.split('_')[2]
  }

  return txHash
}

const buildTxId = (safeAddress: string, info: SdkSafeTxInfo): string => {
  return `multisig_${safeAddress.toLowerCase()}_${info.txHash}_${info.hash}`
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

const toCustomTxInfo = (info: SdkSafeTxInfo, latestStxType: STXType): Transaction['transaction']['txInfo'] => {
  const dataSize = info.details.data ? Math.max(0, (info.details.data.length - 2) / 2) : 0

  let methodName = "Custom Transaction"
  if (info.details.to === process.env.NEXT_PUBLIC_POOL_ADDRESS) {
    if (latestStxType === STXType.Deposit) {
      methodName = "Shield"
    } else if (latestStxType === STXType.Transfer) {
      methodName = "Shielded transfer"
    } else if (latestStxType === STXType.Withdrawal) {
      methodName = "Unshield"
    } else if (latestStxType === STXType.Undefined) {
      methodName = ""
    }

  } else if (info.details.to === process.env.NEXT_PUBLIC_SIGN_MSG_HASH_LIB_ADDRESS) {
    methodName = "Shielded tx multisig"
  }

  return {
    type: TransactionInfoType.CUSTOM,
    to: { value: info.details.to },
    dataSize: dataSize.toString(),
    value: info.details.value.toString(),
    isCancellation: false,
    methodName,
  }
}

const toTransaction = (
  cacheEntry: CachedSdkTx,
  owners: AddressEx[],
  threshold: number,
  latestStxType: STXType
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
      txInfo: toCustomTxInfo(info, latestStxType),
      txHash: info.txHash ?? null,
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
  latestStxType: STXType
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
    txInfo: toCustomTxInfo(info, latestStxType),
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

export const mapSdkQueueToTransactionPage = ({ safeAddress, allTxs, owners, threshold }: MapArgs, isStxExecuted: (_: string) => boolean, latestStxType: STXType): TransactionListPage => {
  clearSdkQueuedTxs()

  // If executed and target === signMsgHashLib then inject stx with exec btn triggering zk-proving
  const signMsgHashLibAdrs = getBermudaSDK().config.signMsgHashLib
  const adjTxs: any[] = []
  for (let i = 0; i < allTxs.length; i++) {
    adjTxs.push(allTxs[i])
    if (allTxs[i].executed && allTxs[i].details.to === signMsgHashLibAdrs) {

      const stxExecuted = isStxExecuted(allTxs[i].txHash ?? "0x")

      adjTxs.push({
        // bogus just to have a unique tx id - not sure if this required
        hash: '0x',//toBeHex(BigInt(allTxs[i].hash) - 1n),
        details: {
          to: process.env.NEXT_PUBLIC_POOL_ADDRESS,
          data: '0x',
          value: '0',
          operation: 0,
          safeTxGas: '0',
          baseGas: '0',
          gasPrice: '0',
          gasToken: ZeroAddress,
          refundReceiver: ZeroAddress,
          // "Inheriting" the nonce here to display a grouped tx for the
          // mutlisig auth and shielded exec bundle
          nonce: allTxs[i].details.nonce
        },
        // "Inheriting" signatures is important to mark this as executable
        signatures: allTxs[i].signatures,
        executed: false,
        stxExecuted,
        // "Inheriting" the txHash here to display a grouped tx for the
        // mutlisig auth and shielded exec bundle
        txHash: allTxs[i].txHash
      })
    }
  }

  const pendingTxs = adjTxs
    .filter((tx, i, arr) => {
      console.log("$$$$ exec status", { txExecuted: tx.executed, stxExecuted: tx.stxExecuted })
      return !(tx.executed || tx.stxExecuted)
    })

  const sorted = [...pendingTxs].sort((a, b) => Number(a.details.nonce) - Number(b.details.nonce))
  const now = Date.now()

  const results = sorted.map((info, index) => {
    //TODO fetch info.txHash tx and check the tx block / approx. timestamp
    const timestamp = now - index
    const cacheEntry: CachedSdkTx = { safeAddress, info, timestamp }
    const txId = buildTxId(safeAddress, info)
    setSdkQueuedTx(txId, cacheEntry)
    return toTransaction(cacheEntry, owners, threshold, latestStxType)
  })

  return { results }
}

export const getCachedTransactionDetails = (
  txId: string,
  owners: AddressEx[],
  threshold: number,
  latestStxType: STXType
): TransactionDetails | undefined => {
  const cached = getSdkQueuedTx(txId)
  if (!cached) {
    return undefined
  }

  return toTransactionDetails(cached, owners, threshold, latestStxType)
}
