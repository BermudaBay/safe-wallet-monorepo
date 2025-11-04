import { type ReactElement, useContext, useMemo } from 'react'
import { Button, Tooltip } from '@mui/material'
import NoAssetsIcon from '@/public/images/balances/no-assets.svg'
import CheckWallet from '@/components/common/CheckWallet'
import Track from '@/components/common/Track'
import { ASSETS_EVENTS } from '@/services/analytics/events/assets'
import { useVisibleBalances } from '@/hooks/useVisibleBalances'
import { TxModalContext } from '@/components/tx-flow'
import { UnshieldAssetsFlow } from '@/components/tx-flow/flows'

const UnshieldAssetsButton = ({ sx, disabled }: any): ReactElement => {
  const { setTxFlow } = useContext(TxModalContext)
  const { balances } = useVisibleBalances()

  const hasShieldedAssets = useMemo(() => {
    // return balances.items.some((item) => item.balance !== '0')
    return false //TODO TODO TODO TODO TODO TODO TODO TODO TODO
  }, [balances.items])

  const onClick = () => {
    setTxFlow(<UnshieldAssetsFlow />)
  }

  const tooltipTitle = !hasShieldedAssets ? 'Cannot unshield when shielded asset balance is zero' : ''

  return (
    <CheckWallet allowSpendingLimit>
      {(isOk) => (
        <Track {...ASSETS_EVENTS.SHIELD_ASSETS}>
          <Tooltip title={tooltipTitle} arrow placement="top">
            <span>
              <Button
                data-testid="shield-assets-btn"
                onClick={onClick}
                variant="contained"
                size="small"
                disabled={(disabled ?? !isOk) || !hasShieldedAssets}
                startIcon={<NoAssetsIcon style={{ width: "19px" }} />}
                sx={{ ...sx }}
              >
                Unshield tokens
              </Button>
            </span>
          </Tooltip>
        </Track>
      )
      }
    </CheckWallet >
  )
}

export default UnshieldAssetsButton
