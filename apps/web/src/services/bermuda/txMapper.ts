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
import { ZeroAddress } from 'ethers'

type MapArgs = {
  safeAddress: string
  allTxs: SdkSafeTxInfo[]
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

export const mapSdkQueueToTransactionPage = ({ safeAddress, allTxs, owners, threshold }: MapArgs): TransactionListPage => {
  clearSdkQueuedTxs()

  // If executed and target === signMsgHashLib then inject stx with exec btn triggering zk-proving
  const signMsgHashLibAdrs = getBermudaSDK().config.signMsgHashLib
  const adjTxs: any[] = []
  for (let i = 0; i < allTxs.length; i++) {
    adjTxs.push(allTxs[i])
    if (allTxs[i].executed && allTxs[i].details.to === signMsgHashLibAdrs) {

      //TODO list all MessageCiphertext events, try decrypt, then decode, then stxhash()
      // if resulting stxhash included in allTxs[i].details.data its most likely the preimage
      // correspnding to the stx hash that got "signed" thru the multisig 
      // (probly better to check for the exact position of the stx hash in the payload)
      // ->
      // then would be good if we could pkg that into a tx list item to display stx details
      // <- the stx details should also be shown in the (pub) multisig tx (signMsgHashLib.signMessageHash) list item details view if possible
      //
      // BUT the important part is injecting a custom tx box into the queue with an execute 
      // button that onclick generates the mpt zk proof then the stx proof and sends them off via the relayer

      adjTxs.push({
        hash: allTxs[i].hash,
        details: {
          to: ZeroAddress,
          data: "0x",
          value: '0',
          operation: 0,
          safeTxGas: '0',
          baseGas: '0',
          gasPrice: '0',
          gasToken: ZeroAddress,
          refundReceiver: ZeroAddress,
          nonce: '0',
        },
        signatures: allTxs[i].signatures,
        executed: false,
        stxExecuted: false
      })
    }
  }

  const pendingTxs = adjTxs.filter(tx => !tx.executed && !tx.stxExecuted)

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
