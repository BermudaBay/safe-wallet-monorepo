import TxCard from '@/components/tx-flow/common/TxCard'
import { Grid2 as Grid, Stack, StepIcon, Typography } from '@mui/material'
import ExternalLink from '@/components/common/ExternalLink'
import { type PropsWithChildren, useContext, useEffect, useState } from 'react'
import { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import useTxPreview from '../confirmation-views/useTxPreview'
import Track from '@/components/common/Track'
import { MODALS_EVENTS } from '@/services/analytics'
import useWallet from '@/hooks/wallets/useWallet'
import { isHardwareWallet, isLedgerLive } from '@/utils/wallets'
import { TxFlowStep } from '@/components/tx-flow/TxFlowStep'
import { Receipt } from '../ConfirmTxDetails/Receipt'
import { useBermuda } from '@/contexts/bermuda-context'
import { ShieldedReceipt } from '../ConfirmTxDetails/ShieldedReceipt'
import { Slot, SlotName } from '@/components/tx-flow/slots'
import { Sign } from '@/components/tx-flow/actions/Sign'
import { getTxHash } from '@/services/bermuda/txMapper'
import { type SafeStxHashParams } from '@/services/bermuda/types'

const InfoSteps = [
  {
    label: 'Review what you will sign',
    description: (
      <Typography>
        Signing is an irreversible action so make sure you know what you are signing.{' '}
        <Track {...MODALS_EVENTS.SIGNING_ARTICLE}>
          <ExternalLink href="https://help.safe.global/en/articles/276343-how-to-perform-basic-transactions-checks-on-safe-wallet">
            Read more
          </ExternalLink>
        </Track>
        .
      </Typography>
    ),
  },
  {
    label: 'Compare with your wallet',
    description: (
      <Typography>
        Once you click <b>Sign</b>, the transaction will appear in your signing wallet. Make sure that all the details
        match.
      </Typography>
    ),
  },
  {
    label: 'Verify with external tools',
    description: (
      <Typography>
        You can additionally cross-verify your transaction data in a third-party tool like{' '}
        <Track {...MODALS_EVENTS.OPEN_SAFE_UTILS}>
          <ExternalLink href="https://safeutils.openzeppelin.com/">Safe Utils</ExternalLink>
        </Track>
        .
      </Typography>
    ),
  },
]

const HardwareWalletStep = [
  InfoSteps[1],
  {
    label: 'Compare with your device',
    description: (
      <Typography>
        If you&apos;re using a hardware wallet with &ldquo;blind signing&rdquo;, please compare what you see on your
        device with the hashes on the right.
      </Typography>
    ),
  },
  InfoSteps[2],
]

export const ConfirmTxReceipt = ({ children, onSubmit, txId }: PropsWithChildren<{ onSubmit: () => void, txId?: string }>) => {
  const { safeTx } = useContext(SafeTxContext)
  const [txPreview] = useTxPreview(safeTx?.data)
  const wallet = useWallet()
  const { stxInfo, getStxPreimage } = useBermuda()
  const showHashes = wallet ? isHardwareWallet(wallet) || isLedgerLive(wallet) : false
  const steps = showHashes ? HardwareWalletStep : InfoSteps
  const [stxPreimage, setStxPreimage] = useState<SafeStxHashParams | undefined>()

  useEffect(() => {
    if (txId) {
      async function run() {
        const txHash = getTxHash(txId!)
        const preimage = await getStxPreimage(txHash)
        setStxPreimage(preimage)
      }
      run()
    }
  }, [txId, getStxPreimage])

  // Try to use stx preimage data from chain or default to data in local storage.
  // We default to local storage as this component is also used when someone
  // initiates a shield, transfer or unshield and at that point in time there's
  // no data about the stx available on-chain yet.
  const shieldedTxData = stxPreimage ?? stxInfo?.data

  if (!safeTx) {
    return false
  }

  return (
    <TxFlowStep title="Review details" fixedNonce>
      <TxCard>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Stack px={1} gap={6}>
              {steps.map(({ label, description }, index) => (
                <Stack key={index} spacing={2} direction="row">
                  <StepIcon icon={index + 1} active />
                  <Stack spacing={1}>
                    <Typography fontWeight="bold">{label}</Typography>
                    {description}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            {shieldedTxData ? (
              <ShieldedReceipt
                safeTxData={safeTx?.data}
                shieldedTxData={shieldedTxData}
                txData={txPreview?.txData}
                txInfo={txPreview?.txInfo}
              />
            ) : (
              <Receipt safeTxData={safeTx?.data} txData={txPreview?.txData} txInfo={txPreview?.txInfo} />
            )}
          </Grid>
        </Grid>

        {children}

        <Slot name={SlotName.Submit} onSubmitSuccess={onSubmit}>
          <Sign
            onSubmitSuccess={onSubmit}
            options={[{ id: 'sign', label: 'Sign' }]}
            onChange={() => {}}
            slotId="sign"
          />
        </Slot>
      </TxCard>
    </TxFlowStep>
  )
}
