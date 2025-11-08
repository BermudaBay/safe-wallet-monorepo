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

  // If txSummary.txHash went to SignMsgHashLib this is a custom stx box and
  // we want to enable the execute button
  let [isStx, setIsStx] = useState(false)
  useEffect(() => {
    (async function checkTx() {
      console.log("$$$$$ txSummary.txHash", txSummary.txHash)
      const tx = await bermuda.sdk.config.provider.getTransaction(txSummary.txHash)
      console.log("$$$$$ tx", tx)
      setIsStx(tx?.to?.toLowerCase() === bermuda.sdk.config.signMsgHashLib.toLowerCase())
    })()
  }, [bermuda.sdk.config, txSummary.txHash])

  //REVISIT and CHECK
  //FIXME disable for shielded deposits
  // const problyStx = safe.nonce === (txNonce || 0) + 1

  const isNext = (txNonce !== undefined && txNonce === safe.nonce) //|| problyStx
  const isDisabled = !isStx && (!isNext || !bermuda.sdk || expiredSwap || isPending)

  const onClick = (e: SyntheticEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (isStx) {
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
          <Tooltip title={isOk && !isNext ? 'You must execute the transaction with the lowest nonce first' : ''}>
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
