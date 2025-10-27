import CheckWallet from '@/components/common/CheckWallet'
import { AppRoutes } from '@/config/routes'
import useSpendingLimit from '@/hooks/useSpendingLimit'
import { Button } from '@mui/material'
import type { TokenInfo } from '@safe-global/safe-gateway-typescript-sdk'
import { TokenType } from '@safe-global/safe-gateway-typescript-sdk'
import { useRouter } from 'next/router'
import type { ReactElement } from 'react'
import StakeIcon from '@/public/images/common/stake.svg'
import { useCurrentChain } from '@/hooks/useChains'
import css from './styles.module.css'
import classnames from 'classnames'

const StakeButton = ({ tokenInfo, compact = true }: { tokenInfo: TokenInfo; compact?: boolean }): ReactElement => {
  const spendingLimit = useSpendingLimit(tokenInfo)
  const chain = useCurrentChain()
  const router = useRouter()

  return (
    <CheckWallet allowSpendingLimit={!!spendingLimit}>
      {(isOk) => (
        <Button
          className={classnames({ [css.button]: compact, [css.buttonDisabled]: !isOk })}
          data-testid="stake-btn"
          aria-label="Stake"
          variant={compact ? 'text' : 'contained'}
          color={compact ? 'info' : 'background.paper'}
          size={compact ? 'small' : 'compact'}
          disableElevation
          startIcon={<StakeIcon />}
          onClick={() => {
            router.push({
              pathname: AppRoutes.stake,
              query: {
                ...router.query,
                asset: `${chain?.shortName}_${
                  tokenInfo.type === TokenType.NATIVE_TOKEN ? 'NATIVE_TOKEN' : tokenInfo.address
                }`,
              },
            })
          }}
          disabled={!isOk}
        >
          Stake
        </Button>
      )}
    </CheckWallet>
  )
}

export default StakeButton
