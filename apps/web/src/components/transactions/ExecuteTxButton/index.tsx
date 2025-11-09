import useIsExpiredSwap from '@/features/swap/hooks/useIsExpiredSwap'
import useIsPending from '@/hooks/useIsPending'
import type { SyntheticEvent } from 'react'
import { type ReactElement, useContext, useEffect, useState } from 'react'
import { type TransactionSummary } from '@safe-global/safe-gateway-typescript-sdk'
import { Button, Tooltip } from '@mui/material'

import useSafeInfo from '@/hooks/useSafeInfo'
import { isMultisigExecutionInfo } from '@/utils/transaction-guards'
import Track from '@/components/common/Track'
import { TX_LIST_EVENTS } from '@/services/analytics/events/txList'
import { ReplaceTxHoverContext } from '../GroupedTxListItems/ReplaceTxHoverProvider'
import CheckWallet from '@/components/common/CheckWallet'
import { TxModalContext } from '@/components/tx-flow'
import { ConfirmTxFlow } from '@/components/tx-flow/flows'
import { dispatchProofs } from '@/services/bermuda/dispatchProofs'
import { useBermuda } from '@/contexts/bermuda-context'

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
  const bermuda = useBermuda()

  const expiredSwap = useIsExpiredSwap(txSummary.txInfo)

  const methodName = (txSummary.txInfo as any).methodName
  const isStxTransferOrUnshield = methodName === "Shielded transfer" || methodName === "Unshield"

  const isNext = (txNonce !== undefined && txNonce === safe.nonce) //|| problyStx
  const isDisabled = !isStxTransferOrUnshield && (!isNext || !bermuda.sdk || expiredSwap || isPending)

  const onClick = (e: SyntheticEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (isStxTransferOrUnshield) {
      dispatchProofs(bermuda.keyPair, safe.address.value, txSummary)
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
                  sx={{ minWidth: '106.5px', py: compact ? 0.8 : undefined }}
                >
                  Execute
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
