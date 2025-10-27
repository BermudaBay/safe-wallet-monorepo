import CheckWallet from '@/components/common/CheckWallet'
import { AppRoutes } from '@/config/routes'
import useSpendingLimit from '@/hooks/useSpendingLimit'
import { Button } from '@mui/material'
import type { TokenInfo } from '@safe-global/safe-gateway-typescript-sdk'
import { useRouter } from 'next/router'
import type { ReactElement } from 'react'
import SwapIcon from '@/public/images/common/swap.svg'

const SwapButton = ({
  tokenInfo,
  amount,
  light = false,
}: {
  tokenInfo: TokenInfo
  amount: string
  light?: boolean
}): ReactElement => {
  const spendingLimit = useSpendingLimit(tokenInfo)
  const router = useRouter()

  return (
    <CheckWallet allowSpendingLimit={!!spendingLimit}>
      {(isOk) => (
        <Button
          data-testid="swap-btn"
          variant="contained"
          color={light ? 'background.paper' : 'primary'}
          size="compact"
          startIcon={<SwapIcon />}
          disableElevation
          onClick={() => {
            router.push({
              pathname: AppRoutes.swap,
              query: {
                ...router.query,
                token: tokenInfo.address,
                amount,
              },
            })
          }}
          disabled={!isOk}
        >
          Swap
        </Button>
      )}
    </CheckWallet>
  )
}

export default SwapButton
