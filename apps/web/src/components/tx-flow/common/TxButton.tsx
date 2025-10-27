import Link from 'next/link'
import { useRouter } from 'next/router'
import { Button, type ButtonProps } from '@mui/material'

import { useTxBuilderApp } from '@/hooks/safe-apps/useTxBuilderApp'
import { AppRoutes } from '@/config/routes'
import { useContext } from 'react'
import { TxModalContext } from '..'
import SwapIcon from '@/public/images/common/swap.svg'
import AssetsIcon from '@/public/images/sidebar/assets.svg'
import useIsSwapFeatureEnabled from '@/features/swap/hooks/useIsSwapFeatureEnabled'

const buttonSx = {
  height: '58px',
  '& svg path': { fill: 'currentColor' },
}

export const SendTokensButton = ({ onClick, sx }: { onClick: () => void; sx?: ButtonProps['sx'] }) => {
  return (
    <Button
      data-testid="send-tokens-btn"
      onClick={onClick}
      variant="contained"
      sx={sx ?? buttonSx}
      fullWidth
      startIcon={<AssetsIcon width={20} />}
    >
      Send tokens
    </Button>
  )
}

export const TxBuilderButton = () => {
  const txBuilder = useTxBuilderApp()
  const router = useRouter()
  const { setTxFlow } = useContext(TxModalContext)

  if (!txBuilder?.app) return null

  const isTxBuilder = typeof txBuilder.link.query === 'object' && router.query.appUrl === txBuilder.link.query?.appUrl
  const onClick = isTxBuilder ? () => setTxFlow(undefined) : undefined

  return (
    <Link href={txBuilder.link} passHref style={{ width: '100%' }}>
      <Button
        variant="outlined"
        sx={buttonSx}
        fullWidth
        onClick={onClick}
        startIcon={<img src={txBuilder.app.iconUrl} height={24} width="auto" alt={txBuilder.app.name} />}
      >
        Transaction Builder
      </Button>
    </Link>
  )
}

export const MakeASwapButton = () => {
  const router = useRouter()
  const { setTxFlow } = useContext(TxModalContext)
  const isSwapFeatureEnabled = useIsSwapFeatureEnabled()
  if (!isSwapFeatureEnabled) return null

  const isSwapPage = router.pathname === AppRoutes.swap

  const onClick = () => {
    if (isSwapPage) {
      setTxFlow(undefined)
    } else {
      setTxFlow(undefined)
      router.push({
        pathname: AppRoutes.swap,
        query: { safe: router.query.safe },
      })
    }
  }

  return (
    <Button variant="contained" sx={buttonSx} fullWidth startIcon={<SwapIcon width={20} />} onClick={onClick}>
      Swap tokens
    </Button>
  )
}
