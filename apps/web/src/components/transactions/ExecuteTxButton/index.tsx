import useIsExpiredSwap from '@/features/swap/hooks/useIsExpiredSwap'
import useIsPending from '@/hooks/useIsPending'
import type { SyntheticEvent } from 'react'
import { type ReactElement, useContext, useState } from 'react'
import { type TransactionSummary } from '@safe-global/safe-gateway-typescript-sdk'
import { Button, CircularProgress, Tooltip } from '@mui/material'

import useSafeInfo from '@/hooks/useSafeInfo'
import { isMultisigExecutionInfo } from '@/utils/transaction-guards'
import Track from '@/components/common/Track'
import { TX_LIST_EVENTS } from '@/services/analytics/events/txList'
import { ReplaceTxHoverContext } from '../GroupedTxListItems/ReplaceTxHoverProvider'
import CheckWallet from '@/components/common/CheckWallet'
import { TxModalContext } from '@/components/tx-flow'
import { ConfirmTxFlow } from '@/components/tx-flow/flows'
import { dispatchShieldedTransfer } from '@/services/bermuda/dispatchShieldedTransfer'
import { STXType, useBermuda } from '@/contexts/bermuda-context'
import { dispatchShieldedWithdrawal } from '@/services/bermuda/dispatchShieldedWithdrawal'

const ExecuteTxButton = ({
  txSummary,
  compact = false,
}: {
  txSummary: TransactionSummary
  compact?: boolean
}): ReactElement => {
  const { setTxFlow } = useContext(TxModalContext)
  const { safe } = useSafeInfo()
  const txNonce = isMultisigExecutionInfo(txSummary.executionInfo) ? txSummary.executionInfo.nonce : undefined
  const isPending = useIsPending(txSummary.id)
  const { setSelectedTxId } = useContext(ReplaceTxHoverContext)
  const { keyPair, sdk, saveStxExecuted, isStxExecuted, stxInfo } = useBermuda()
  const [isDispatchingProofs, setIsDispatchingProofs] = useState(false)

  const expiredSwap = useIsExpiredSwap(txSummary.txInfo)

  const methodName = (txSummary.txInfo as any).methodName
  const isStxTransferOrUnshield = methodName === "Shielded transfer" || methodName === "Unshield"

  const isNext = (txNonce !== undefined && txNonce === safe.nonce) //|| problyStx
  const _isStxExecuted = sdk && txSummary.txHash && isStxExecuted(txSummary.txHash.toLowerCase())
  const isDisabled = _isStxExecuted || isDispatchingProofs || !isStxTransferOrUnshield && (!isNext || !sdk || expiredSwap || isPending)

  const onClick = async (e: SyntheticEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (isStxTransferOrUnshield) {
      try {
        setIsDispatchingProofs(true)
        console.log(isDispatchingProofs)
        console.log("$$$$$ stxInfo?.type", stxInfo?.type, "stxInfo?.type === STXType.Withdrawal", stxInfo?.type === STXType.Withdrawal)
        if (stxInfo?.type === STXType.Transfer) {
          await dispatchShieldedTransfer(keyPair, safe.address.value, txSummary)
        } else if (stxInfo?.type === STXType.Withdrawal) {
          await dispatchShieldedWithdrawal(keyPair, safe.address.value, txSummary)
        } else {
          throw Error("Unexpected stx type " + stxInfo?.type)
        }

        saveStxExecuted(txSummary.txHash!.toLowerCase())
      } catch (err) {
        console.error(err)
      } finally {
        setIsDispatchingProofs(false)
      }
      console.log(isDispatchingProofs)
    } else {
      setTxFlow(<ConfirmTxFlow txSummary={txSummary} />, undefined, false)
    }
  }

  const onMouseEnter = () => {
    setSelectedTxId(txSummary.id)
  }

  const onMouseLeave = () => {
    setSelectedTxId(undefined)
  }

  return (
    <>
      <CheckWallet allowNonOwner>
        {(isOk) => (
          <Tooltip title={isOk && !isNext && !isStxTransferOrUnshield ? 'You must execute the transaction with the lowest nonce first' : ''}>
            <span>
              <Track {...TX_LIST_EVENTS.EXECUTE}>
                <Button
                  onClick={onClick}
                  onMouseEnter={onMouseEnter}
                  onMouseLeave={onMouseLeave}
                  variant="contained"
                  disabled={!isOk || isDisabled}
                  size={compact ? 'small' : 'stretched'}
                  sx={{ minWidth: '106.5px', py: compact ? 0.8 : undefined, cursor: isDisabled ? 'default' : 'pointer' }}
                >
                  {isDispatchingProofs ? <CircularProgress color='primary' size='15px' thickness={5} /> : 'Execute'}
                </Button>
              </Track>
            </span>
          </Tooltip>
        )}
      </CheckWallet>
    </>
  )
}

export default ExecuteTxButton
