import CheckWallet from '@/components/common/CheckWallet'
import { AppRoutes } from '@/config/routes'
import useSpendingLimit from '@/hooks/useSpendingLimit'
import { Button } from '@mui/material'
import type { TokenInfo } from '@safe-global/safe-gateway-typescript-sdk'
import { useRouter } from 'next/router'
import type { ReactElement } from 'react'
import EarnIcon from '@/public/images/common/earn.svg'
import { useCurrentChain } from '@/hooks/useChains'
import css from './styles.module.css'
import classnames from 'classnames'

const EarnButton = ({ tokenInfo, compact = true }: { tokenInfo: TokenInfo; compact?: boolean }): ReactElement => {
  const spendingLimit = useSpendingLimit(tokenInfo)
  const chain = useCurrentChain()
  const router = useRouter()

  const onEarnClick = () => {
    router.push({
      pathname: AppRoutes.earn,
      query: {
        ...router.query,
        asset_id: `${chain?.chainId}_${tokenInfo.address}`,
      },
    })
  }

  return (
    <CheckWallet allowSpendingLimit={!!spendingLimit}>
      {(isOk) => (
        <Button
          className={classnames({ [css.button]: compact, [css.buttonDisabled]: !isOk })}
          data-testid="earn-btn"
          aria-label="Earn"
          variant={compact ? 'text' : 'contained'}
          color={compact ? 'info' : 'background.paper'}
          size={compact ? 'small' : 'compact'}
          disableElevation
          startIcon={<EarnIcon />}
          onClick={onEarnClick}
          disabled={!isOk}
        >
          Earn
        </Button>
      )}
    </CheckWallet>
  )
}

export default EarnButton
