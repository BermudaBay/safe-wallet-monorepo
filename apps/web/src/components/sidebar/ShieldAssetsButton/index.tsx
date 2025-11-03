import { type ReactElement, useContext, useMemo } from 'react'
import { Button, Tooltip } from '@mui/material'
import ShieldIcon from '@mui/icons-material/Shield'
import CheckWallet from '@/components/common/CheckWallet'
import { ASSETS_EVENTS, trackEvent } from '@/services/analytics'
import { useVisibleBalances } from '@/hooks/useVisibleBalances'
import { TxModalContext } from '@/components/tx-flow'
import { ShieldAssetsFlow } from '@/components/tx-flow/flows'

const ShieldAssetsButton = (): ReactElement => {
  const { setTxFlow } = useContext(TxModalContext)
  const { balances } = useVisibleBalances()

  const hasAssets = useMemo(() => {
    return balances.items.some((item) => item.balance !== '0')
  }, [balances.items])

  const onClick = () => {
    setTxFlow(<ShieldAssetsFlow />)
    trackEvent({ ...ASSETS_EVENTS.SHIELD_ASSETS, label: 'sidebar' })
  }

  const tooltipTitle = !hasAssets ? 'Cannot shield assets when balance is zero' : ''

  return (
    <CheckWallet allowSpendingLimit>
      {(isOk) => (
        <Tooltip title={tooltipTitle} arrow placement="top">
          <span>
            <Button
              data-testid="shield-assets-sidebar-btn"
              onClick={onClick}
              variant="outlined"
              size="small"
              disabled={!isOk || !hasAssets}
              fullWidth
              disableElevation
              startIcon={<ShieldIcon />}
              sx={{ py: 1.3 }}
            >
              Shield Assets
            </Button>
          </span>
        </Tooltip>
      )}
    </CheckWallet>
  )
}

export default ShieldAssetsButton
