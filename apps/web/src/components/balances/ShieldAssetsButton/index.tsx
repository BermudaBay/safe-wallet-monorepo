import { type ReactElement, useContext, useMemo } from 'react'
import { Button, Tooltip } from '@mui/material'
import ShieldIcon from '@mui/icons-material/Shield'
import CheckWallet from '@/components/common/CheckWallet'
import Track from '@/components/common/Track'
import { ASSETS_EVENTS } from '@/services/analytics/events/assets'
import { useVisibleBalances } from '@/hooks/useVisibleBalances'
import { TxModalContext } from '@/components/tx-flow'
import { ShieldAssetsFlow } from '@/components/tx-flow/flows'
import { useBermuda } from '@/contexts/bermuda-context'

const ShieldAssetsButton = ({ sx, disabled }: any): ReactElement => {
  const { keyPair } = useBermuda()
  const { balances } = useVisibleBalances()
  const { setTxFlow } = useContext(TxModalContext)

  const hasAssets = useMemo(() => {
    return balances.items.some((item) => item.balance !== '0')
  }, [balances.items])

  const onClick = () => {
    setTxFlow(<ShieldAssetsFlow />)
  }

  let tooltipTitle = ''

  if (!keyPair) {
    tooltipTitle = "Setup this Safe's shielded account in the settings"
  } else if (!hasAssets) {
    tooltipTitle = "This Safe doesn't have any assets"
  }

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
                disabled={!keyPair || (disabled ?? !isOk) || !hasAssets}
                startIcon={<ShieldIcon />}
                sx={{ ...sx }}
              >
                Shield tokens
              </Button>
            </span>
          </Tooltip>
        </Track>
      )}
    </CheckWallet>
  )
}

export default ShieldAssetsButton
