import { type ReactElement, useContext, useMemo } from 'react'
import { Button, Tooltip } from '@mui/material'
import CheckWallet from '@/components/common/CheckWallet'
import Track from '@/components/common/Track'
import { ASSETS_EVENTS } from '@/services/analytics/events/assets'
import { useVisibleBalances } from '@/hooks/useVisibleBalances'
import { TxModalContext } from '@/components/tx-flow'
import { ShieldedAssetsTransferFlow } from '@/components/tx-flow/flows'

const ShieldedAssetsTransferButton = ({ disabled }: any): ReactElement => {
  const { setTxFlow } = useContext(TxModalContext)
  const { balances } = useVisibleBalances()

  const hasShieldedAssets = useMemo(() => {
    // return balances.items.some((item) => item.balance !== '0')
    return false //TODO TODO TODO TODO TODO TODO TODO TODO TODO
  }, [balances.items])

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
