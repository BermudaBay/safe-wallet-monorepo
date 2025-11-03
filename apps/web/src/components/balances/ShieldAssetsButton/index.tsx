import { type ReactElement, useMemo } from 'react'
import { Button, Tooltip } from '@mui/material'
import ShieldIcon from '@mui/icons-material/Shield'
import CheckWallet from '@/components/common/CheckWallet'
import Track from '@/components/common/Track'
import { ASSETS_EVENTS } from '@/services/analytics/events/assets'
import { useVisibleBalances } from '@/hooks/useVisibleBalances'
import { handleShieldAssets } from '@/services/bermuda/deposit'

const ShieldAssetsButton = (): ReactElement => {
  const { balances } = useVisibleBalances()

  const hasAssets = useMemo(() => {
    return balances.items.some((item) => item.balance !== '0')
  }, [balances.items])

  const onClick = () => {
    handleShieldAssets()
  }

  const tooltipTitle = !hasAssets ? 'Cannot shield assets when balance is zero' : ''

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
                disabled={!isOk || !hasAssets}
                startIcon={<ShieldIcon />}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Shield Assets
              </Button>
            </span>
          </Tooltip>
        </Track>
      )}
    </CheckWallet>
  )
}

export default ShieldAssetsButton
