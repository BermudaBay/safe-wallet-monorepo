import StatusStepper from './StatusStepper'
import { Button, Container, Divider, Paper } from '@mui/material'
import classnames from 'classnames'
import Link from 'next/link'
import css from './styles.module.css'
import { useAppDispatch } from '@/store'
import { showNotification } from '@/store/notificationsSlice'
import { useAppDispatch, useAppSelector } from '@/store'
import { PendingStatus, selectPendingTxById } from '@/store/pendingTxsSlice'
import { useCallback, useContext, useEffect, useState } from 'react'
import { useCurrentChain } from '@/hooks/useChains'
import { TxEvent, txSubscribe } from '@/services/tx/txEvents'
import useSafeInfo from '@/hooks/useSafeInfo'
import { TxModalContext } from '../..'
import LoadingSpinner, { SpinnerStatus } from '@/components/new-safe/create/steps/StatusStep/LoadingSpinner'
import { ProcessingStatus } from '@/components/tx-flow/flows/SuccessScreen/statuses/ProcessingStatus'
import { IndexingStatus } from '@/components/tx-flow/flows/SuccessScreen/statuses/IndexingStatus'
import { DefaultStatus } from '@/components/tx-flow/flows/SuccessScreen/statuses/DefaultStatus'
import { isSwapTransferOrderTxInfo } from '@/utils/transaction-guards'
import { getTxLink } from '@/utils/tx-link'
import useTxDetails from '@/hooks/useTxDetails'
import { usePredictSafeAddressFromTxDetails } from '@/hooks/usePredictSafeAddressFromTxDetails'
import { AppRoutes } from '@/config/routes'
import { NESTED_SAFE_EVENTS, NESTED_SAFE_LABELS } from '@/services/analytics/events/nested-safes'
import Track from '@/components/common/Track'
import { STXType, useBermuda } from '@/contexts/bermuda-context'
import { useRouter } from 'next/router'

interface Props {
  /** The ID assigned to the transaction in the client-gateway */
  txId?: string
  /** For module transaction, pass the transaction hash while the `txId` is not yet available */
  txHash?: string
}

const SuccessScreen = ({ txId, txHash }: Props) => {
  const [localTxHash, setLocalTxHash] = useState<string | undefined>(txHash)
  const [error, setError] = useState<Error>()
  const { setTxFlow } = useContext(TxModalContext)
  const chain = useCurrentChain()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { stxType } = useBermuda()
  const pendingTx = useAppSelector((state) => (txId ? selectPendingTxById(state, txId) : undefined))
  const { safeAddress } = useSafeInfo()
  const status = !txId && txHash ? PendingStatus.INDEXING : pendingTx?.status
  const pendingTxHash = pendingTx && 'txHash' in pendingTx ? pendingTx.txHash : undefined
  const txLink = chain && txId && getTxLink(txId, chain, safeAddress)
  const [txDetails] = useTxDetails(txId)
  // const [isShieldedDeposit, setIsShieldedDeposit] = useState<boolean>(true)
  const isSwapOrder = txDetails && isSwapTransferOrderTxInfo(txDetails.txInfo)
  const [predictedSafeAddress] = usePredictSafeAddressFromTxDetails(txDetails)

  // useEffect(() => {
  //   async function run() {
  //     // const { all } = await sdk.safe.listTxs(safeAddress)
  //     // const transaction = all.find((item: any) => item.hash.toLowerCase() === txHash!.toLowerCase())

  //     const txHash = txId?.split("_").pop()
  //     console.log("$$$$$txHash && safeAddress", { txHash, safeAddress, txId })

  //     const transaction = await sdk.config.provider.getTransaction(txHash)

  //     console.log('transaction', transaction)

  //     // if (transaction.details.to.toLowerCase() === sdk.config.signMsgHashLib.toLowerCase()) {
  //     if (transaction.to.toLowerCase() === safeAddress.toLowerCase() && transaction.data.includes(sdk.config.signMsgHashLib.toLowerCase())) {
  //       setIsShieldedDeposit(false)
  //     }
  //   }

  //   if (sdk && txId && safeAddress) {
  //     run()
  //   }
  // }, [txId, sdk, safeAddress])

  // console.log('isShieldedDeposit', isShieldedDeposit)

  useEffect(() => {
    if (!pendingTxHash) return

    setLocalTxHash(pendingTxHash)
  }, [pendingTxHash])

  useEffect(() => {
    const unsubFns: Array<() => void> = ([TxEvent.FAILED, TxEvent.REVERTED] as const).map((event) =>
      txSubscribe(event, (detail) => {
        if (detail.txId === txId && pendingTx) setError(detail.error)
      }),
    )

    return () => unsubFns.forEach((unsubscribe) => unsubscribe())
  }, [txId, pendingTx])

  const onClose = useCallback(() => {
    setTxFlow(undefined)
  }, [setTxFlow])

  const isSuccess = status === undefined
  const spinnerStatus = error ? SpinnerStatus.ERROR : isSuccess ? SpinnerStatus.SUCCESS : SpinnerStatus.PROCESSING

  useEffect(() => {
    if (isSuccess && (stxType === STXType.Transfer || stxType === STXType.Withdrawal)) {
      dispatch(
        showNotification({
          title: 'Success',
          message: 'Shielded transaction successful',
          groupKey: 'shielded-transactions',
          variant: 'success',
        }),
      )
    }
  }, [isSuccess, stxType])

  useEffect(() => {
    if (isSuccess && (stxType === STXType.Transfer || stxType === STXType.Withdrawal) && router.isReady) {
      //TODO instead of hard reloading would be better to close the success screen overlay modal
      router.push(`/transactions/queue?safe=dev:${safeAddress}`)
      router.reload()
    }
  }, [isSuccess, stxType, router.isReady])

  let StatusComponent
  switch (status) {
    case PendingStatus.PROCESSING:
    case PendingStatus.RELAYING:
      // status can only have these values if txId & pendingTx are defined
      StatusComponent = <ProcessingStatus txId={txId!} pendingTx={pendingTx!} willDeploySafe={!!predictedSafeAddress} />
      break
    case PendingStatus.INDEXING:
      StatusComponent = <IndexingStatus willDeploySafe={!!predictedSafeAddress} />
      break
    default:
      StatusComponent = <DefaultStatus error={error} willDeploySafe={!!predictedSafeAddress} />
  }

  return (
    <Container
      component={Paper}
      disableGutters
      sx={{
        textAlign: 'center',
        maxWidth: `${900 - 75}px`, // md={11}
      }}
      maxWidth={false}
    >
      <div className={css.row}>
        <LoadingSpinner status={spinnerStatus} />
        {StatusComponent}
      </div>

      {!error && (
        <>
          <Divider />
          <div className={css.row}>
            <StatusStepper status={status} txHash={localTxHash} />
          </div>
        </>
      )}

      <Divider />

      <div className={classnames(css.row, css.buttons)}>
        {isSwapOrder && (
          <Button data-testid="finish-transaction-btn" variant="outlined" size="small" onClick={onClose}>
            Back to swaps
          </Button>
        )}

        {txLink && (
          <Link {...txLink} passHref target="_blank" rel="noreferrer" legacyBehavior>
            <Button
              data-testid="view-transaction-btn"
              variant={isSwapOrder ? 'contained' : 'outlined'}
              size="small"
              onClick={onClose}
            >
              View transaction
            </Button>
          </Link>
        )}

        {!isSwapOrder &&
          (predictedSafeAddress ? (
            <Track {...NESTED_SAFE_EVENTS.OPEN_NESTED_SAFE} label={NESTED_SAFE_LABELS.success_screen}>
              <Link
                href={{ pathname: AppRoutes.home, query: { safe: `${chain?.shortName}:${predictedSafeAddress}` } }}
                passHref
                legacyBehavior
              >
                <Button
                  data-testid="open-nested-safe-btn"
                  variant="contained"
                  size="small"
                  onClick={onClose}
                  disabled={!isSuccess}
                >
                  Go to Nested Safe
                </Button>
              </Link>
            </Track>
          ) : (
            <Button data-testid="finish-transaction-btn" variant="contained" size="small" onClick={onClose}>
              Finish
            </Button>
          ))}
      </div>
    </Container>
  )
}

export default SuccessScreen
