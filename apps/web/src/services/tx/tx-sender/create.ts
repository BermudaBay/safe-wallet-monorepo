import { getReadOnlyGnosisSafeContract } from '@/services/contracts/safeContracts'
import { SENTINEL_ADDRESS } from '@safe-global/protocol-kit/dist/src/utils/constants'
import type { ChainInfo, TransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { getTransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { EthSafeTransaction, type AddOwnerTxParams, type RemoveOwnerTxParams, type SwapOwnerTxParams } from '@safe-global/protocol-kit'
import { OperationType, type MetaTransactionData, type SafeTransaction, type SafeTransactionDataPartial } from '@safe-global/types-kit'
import extractTxInfo from '../extractTxInfo'
import { getAndValidateSafeSDK } from './sdk'
import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import { Interface, ZeroAddress } from 'ethers'
import { getSdkQueuedTx } from '@/services/bermuda/txCache'

/**
 * Create a transaction from raw params
 */
export const createTx = async (txParams: SafeTransactionDataPartial, nonce?: number): Promise<SafeTransaction> => {
  if (nonce !== undefined) txParams = { ...txParams, nonce }
  // const safeSDK = getAndValidateSafeSDK()
  // return safeSDK.createTransaction({ transactions: [txParams] })
  return new EthSafeTransaction({
    operation: 0,
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: ZeroAddress,
    refundReceiver: ZeroAddress,
    nonce: 0,
    ...txParams
  })
}

/**
 * Create a multiSendCallOnly transaction from an array of MetaTransactionData and options
 * If only one tx is passed it will be created without multiSend and without onlyCalls.
 */
export const createMultiSendCallOnlyTx = async (txParams: MetaTransactionData[]): Promise<SafeTransaction> => {
  // const safeSDK = getAndValidateSafeSDK()
  // return safeSDK.createTransaction({ transactions: txParams, onlyCalls: true })

  const bermudaSDK = getBermudaSDK()

  if (txParams.length === 0) throw Error('No transactions')
  if (txParams.length === 1) {
    return new EthSafeTransaction({
      safeTxGas: '0',
      baseGas: '0',
      gasPrice: '0',
      gasToken: ZeroAddress,
      refundReceiver: ZeroAddress,
      nonce: 0,
      operation: OperationType.Call,
      ...txParams[0]
    })
  }

  const multiSendData = bermudaSDK.safe.utils.encodeMultiSendData(txParams)
  const data =
    Interface.from(["function multiSend(bytes memory transactions) public"])
      .encodeFunctionData('multiSend', [multiSendData])

  return new EthSafeTransaction({
    to: bermudaSDK.config.multiSendCallOnly!,
    data,
    operation: OperationType.DelegateCall,
    value: '0',
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: ZeroAddress,
    refundReceiver: ZeroAddress,
    nonce: 0,
  })
}

export const createRemoveOwnerTx = async (txParams: RemoveOwnerTxParams): Promise<SafeTransaction> => {
  throw Error("Not implemented")
  // const safeSDK = getAndValidateSafeSDK()
  // return safeSDK.createRemoveOwnerTx(txParams)
}

export const createAddOwnerTx = async (
  chain: ChainInfo,
  isDeployed: boolean,
  txParams: AddOwnerTxParams,
): Promise<SafeTransaction> => {
  throw Error("Not implemented")
  // const safeSDK = getAndValidateSafeSDK()
  // if (isDeployed) return safeSDK.createAddOwnerTx(txParams)

  // const safeVersion = safeSDK.getContractVersion()

  // const contract = await getReadOnlyGnosisSafeContract(chain, safeVersion)
  // // @ts-ignore
  // const data = contract.encode('addOwnerWithThreshold', [txParams.ownerAddress, txParams.threshold])

  // const tx = {
  //   to: await safeSDK.getAddress(),
  //   value: '0',
  //   data,
  // }

  // return safeSDK.createTransaction({
  //   transactions: [tx],
  // })
}

export const createSwapOwnerTx = async (
  chain: ChainInfo,
  isDeployed: boolean,
  txParams: SwapOwnerTxParams,
): Promise<SafeTransaction> => {
  throw Error("Not implemented")
  // const safeSDK = getAndValidateSafeSDK()
  // if (isDeployed) return safeSDK.createSwapOwnerTx(txParams)

  // const safeVersion = safeSDK.getContractVersion()

  // const contract = await getReadOnlyGnosisSafeContract(chain, safeVersion)
  // // @ts-ignore SwapOwnerTxParams is a union type and the method expects a specific one
  // const data = contract.encode('swapOwner', [SENTINEL_ADDRESS, txParams.oldOwnerAddress, txParams.newOwnerAddress])

  // const tx = {
  //   to: await safeSDK.getAddress(),
  //   value: '0',
  //   data,
  // }

  // return safeSDK.createTransaction({
  //   transactions: [tx],
  // })
}

export const createUpdateThresholdTx = async (threshold: number): Promise<SafeTransaction> => {
  throw Error("Not implemented")
  // const safeSDK = getAndValidateSafeSDK()
  // return safeSDK.createChangeThresholdTx(threshold)
}

export const createRemoveModuleTx = async (moduleAddress: string): Promise<SafeTransaction> => {
  throw Error("Not implemented")
  // const safeSDK = getAndValidateSafeSDK()
  // return safeSDK.createDisableModuleTx(moduleAddress)
}

export const createRemoveGuardTx = async (): Promise<SafeTransaction> => {
  throw Error("Not implemented")
  // const safeSDK = getAndValidateSafeSDK()
  // return safeSDK.createDisableGuardTx()
}

/**
 * Create a rejection tx
 */
export const createRejectTx = async (nonce: number): Promise<SafeTransaction> => {
  throw Error("Not implemented")
  // const safeSDK = getAndValidateSafeSDK()
  // return safeSDK.createRejectionTransaction(nonce)
}

/**
 * Prepare a SafeTransaction from Client Gateway / Tx Queue
 */
export const createExistingTx = async (
  chainId: string,
  txId: string,
  txDetails?: TransactionDetails,
): Promise<SafeTransaction> => {
  const cached = getSdkQueuedTx(txId)
  if (cached) {
    const { info } = cached
    const nonce = Number(info.details.nonce)

    const txParams: SafeTransactionDataPartial = {
      to: info.details.to,
      data: info.details.data,
      value: info.details.value.toString(),
      operation: info.details.operation as OperationType,
      safeTxGas: info.details.safeTxGas.toString(),
      baseGas: info.details.baseGas.toString(),
      gasPrice: info.details.gasPrice.toString(),
      gasToken: info.details.gasToken,
      refundReceiver: info.details.refundReceiver,
      nonce,
    }

    const safeTx = await createTx(txParams, nonce)

    Object.entries(info.signatures).forEach(([signer, data]) => {
      safeTx.addSignature({
        signer,
        data,
        staticPart: () => data,
        dynamicPart: () => '',
        isContractSignature: false,
      })
    })

    return safeTx
  }

  // Get the tx details from the backend if not provided
  txDetails = txDetails || (await getTransactionDetails(chainId, txId))

  // Convert them to the Core SDK tx params
  const { txParams, signatures } = extractTxInfo(txDetails)

  // Create a tx and add pre-approved signatures
  const safeTx = await createTx(txParams, txParams.nonce)
  Object.entries(signatures).forEach(([signer, data]) => {
    safeTx.addSignature({
      signer,
      data,
      staticPart: () => data,
      dynamicPart: () => '',
      isContractSignature: false,
    })
  })

  return safeTx
}
