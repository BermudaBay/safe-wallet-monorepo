import { type ReactElement, useContext } from 'react'
import { Button, Tooltip } from '@mui/material'
import CheckWallet from '@/components/common/CheckWallet'
import Track from '@/components/common/Track'
import { ASSETS_EVENTS } from '@/services/analytics/events/assets'
import { TxModalContext } from '@/components/tx-flow'
import { ShieldedAssetsTransferFlow } from '@/components/tx-flow/flows'
import { hasShieldedBalance } from '@/hooks/useShieldedBalances'

const ShieldedAssetsTransferButton = ({ disabled }: any): ReactElement => {
  const { setTxFlow } = useContext(TxModalContext)

  const hasShieldedAssets = hasShieldedBalance()

  const onClick = () => {
    setTxFlow(<ShieldedAssetsTransferFlow />)
  }

  const tooltipTitle = !hasShieldedAssets ? 'Cannot do shielded transfer when shielded asset balance is zero' : ''

  return (
    <CheckWallet allowSpendingLimit>
      {(isOk) => (
        <Track {...ASSETS_EVENTS.SHIELD_ASSETS}>
          <Tooltip title={tooltipTitle} arrow placement="top">
            <span>
              <Button
                data-testid="shielded-assets-transfer-btn"
                onClick={onClick}
                variant="contained"
                size="small"
                disabled={(disabled ?? !isOk) || !hasShieldedAssets}
                fullWidth
                startIcon={<span style={{ fontSize: "125%" }}>𝜟</span>}
                sx={{
                  fontSize: "100%",
                  height: '58px',
                  '& svg path': {
                    fill: 'currentColor'
                  }
                }}
              >
                Send shielded tokens
              </Button>
            </span>
          </Tooltip>
        </Track>
      )}
    </CheckWallet>
  )
}

export default ShieldedAssetsTransferButton
