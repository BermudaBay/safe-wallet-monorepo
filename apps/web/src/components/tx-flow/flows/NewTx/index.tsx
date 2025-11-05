import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { MakeASwapButton, SendTokensButton, TxBuilderButton } from '@/components/tx-flow/common/TxButton'
import { Container, Grid, Paper, Typography } from '@mui/material'
import { TxModalContext } from '../../'
import TokenTransferFlow from '../TokenTransfer'
import { useTxBuilderApp } from '@/hooks/safe-apps/useTxBuilderApp'
import { ProgressBar } from '@/components/common/ProgressBar'
import ChainIndicator from '@/components/common/ChainIndicator'
import NewTxIcon from '@/public/images/transactions/new-tx.svg'

import css from './styles.module.css'
import ShieldAssetsButton from '@/components/balances/ShieldAssetsButton'
import ShieldedAssetsTransferButton from '@/components/balances/ShieldedAssetsTransferButton'
import UnshieldAssetsButton from '@/components/balances/UnshieldAssetsButton'
import { useBermuda } from '@/contexts/bermuda-context'
import { useVisibleBalances } from '@/hooks/useVisibleBalances'
import { hasShieldedBalance, useShieldedBalances } from '@/hooks/useShieldedBalances'

const NewTxFlow = () => {
  const txBuilder = useTxBuilderApp()
  const { setTxFlow } = useContext(TxModalContext)
  const bermuda = useBermuda()
  const { balances } = useVisibleBalances()

  const hasAssets = useMemo(() => {
    return balances.items.some((item) => item.balance !== '0')
  }, [balances.items])

  const hasShieldedAssets = hasShieldedBalance()

  const onTokensClick = useCallback(() => {
    setTxFlow(<TokenTransferFlow />)
  }, [setTxFlow])

  const progress = 10

  return (
    <Container className={css.container}>
      <Grid
        container
        sx={{
          justifyContent: 'center',
        }}
      >
        {/* Alignment of `TxLayout` */}
        <Grid
          item
          xs={12}
          md={11}
          sx={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ChainIndicator inline className={css.chain} />

          <Grid container component={Paper}>
            <Grid item xs={12} className={css.progressBar}>
              <ProgressBar value={progress} />
            </Grid>
            <Grid
              item
              xs={12}
              md={6}
              className={css.pane}
              sx={{
                gap: 3,
              }}
            >
              <div className={css.globs}>
                <NewTxIcon />
              </div>

              <Typography variant="h1" className={css.title}>
                New transaction
              </Typography>
            </Grid>

            <Grid
              item
              xs={12}
              md={5}
              className={css.pane}
              sx={{
                gap: 2,
              }}
            >
              <Typography variant="h4" className={css.type}>
                Manage assets
              </Typography>

              <ShieldAssetsButton
                disabled={!(hasAssets && bermuda.keyPair)}
                title={
                  !bermuda.keyPair
                    ? "Setup this Safe's shielded account in the settings"
                    : !hasAssets ? "This Safe doesn't have any assets" : ""
                }
                sx={{
                  fontSize: "100%",
                  width: "100%",
                  height: '58px',
                  '& svg path': {
                    fill: 'currentColor'
                  }
                }}
              />
              <ShieldedAssetsTransferButton
                disabled={!(hasShieldedAssets && bermuda.keyPair)}
                title={
                  !bermuda.keyPair
                    ? "Setup this Safe's shielded account in the settings"
                    : !hasShieldedAssets ? "This Safe doesn't have any shielded assets" : ""
                }
              />
              <UnshieldAssetsButton
                disabled={!(hasShieldedAssets && bermuda.keyPair)}
                title={
                  !bermuda.keyPair
                    ? "Setup this Safe's shielded account in the settings"
                    : !hasShieldedAssets ? "This Safe doesn't have any shielded assets" : ""
                }
                sx={{
                  fontSize: "100%",
                  width: "100%",
                  height: '58px',
                  '& svg path': {
                    fill: 'currentColor'
                  }
                }}
              />
              <SendTokensButton
                disabled={!hasAssets}
                title={!hasAssets ? "This Safe doesn't have any assets" : ""}
                onClick={onTokensClick}
              />
              {/* <MakeASwapButton /> */}

              {txBuilder?.app && (
                <>
                  <Typography
                    variant="h4"
                    className={css.type}
                    sx={{
                      mt: 3,
                    }}
                  >
                    Interact with contracts
                  </Typography>

                  <TxBuilderButton />
                </>
              )}
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  )
}

export default NewTxFlow
