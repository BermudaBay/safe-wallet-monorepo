import { type PropsWithChildren, useContext, useEffect, useMemo } from 'react'
import { SafeTxContext } from '../../SafeTxProvider'
import ReviewTransaction from '@/components/tx/ReviewTransactionV2'
import type { MultiTokenTransferParams } from '../TokenTransfer'
import { createMultiSendCallOnlyTx } from '@/services/tx/tx-sender'
import { buildShieldedDepositMetaTxs } from '@/services/bermuda/buildShieldedDeposit'
import useSafeInfo from '@/hooks/useSafeInfo'
import useBalances from '@/hooks/useBalances'
import { sameAddress } from '@safe-global/utils/utils/addresses'
import { ZERO_ADDRESS } from '@safe-global/protocol-kit/dist/src/utils/constants'
import { Divider, Stack } from '@mui/material'
import ReviewRecipientRow from '../TokenTransfer/ReviewRecipientRow'
import { useCurrentChain } from '@/hooks/useChains'
import { STXType, useBermuda } from '@/contexts/bermuda-context'
import { TxFlowContext, type TxFlowContextType } from '../../TxFlowProvider'
import { buildShieldedWithdrawalMetaTxs } from '@/services/bermuda/buildShieldedWithdrawal'

type ReviewUnshieldAssetsProps = {
  params?: MultiTokenTransferParams
  onSubmit: () => void
  txNonce?: number
}

const ReviewUnshieldAssets = ({
  params,
  onSubmit,
  txNonce,
  children,
}: PropsWithChildren<ReviewUnshieldAssetsProps>) => {
  const { safeAddress } = useSafeInfo()
  const { sdk, keyPair, saveStxType } = useBermuda()
  const { balances } = useBalances()
  const { setSafeTx, setSafeTxError, setNonce, setBatchSafeTxs } = useContext(SafeTxContext)
  const currentChain = useCurrentChain()
  const { data } = useContext(TxFlowContext) as TxFlowContextType<MultiTokenTransferParams>
  const formData = params ?? data

  const recipient = useMemo(() => formData?.recipients?.[0], [formData?.recipients])

  const tokenInfo = useMemo(() => {
    if (!recipient) return undefined
    return balances.items.find(({ tokenInfo: info }) => sameAddress(info.address, recipient.tokenAddress))?.tokenInfo
  }, [balances.items, recipient])

  const tokenDecimals = useMemo(() => {
    if (!recipient) return undefined
    if (tokenInfo?.decimals != null) return tokenInfo.decimals
    if (sameAddress(recipient.tokenAddress, ZERO_ADDRESS)) {
      return currentChain?.nativeCurrency?.decimals ?? 18
    }
    return undefined
  }, [recipient, tokenInfo?.decimals, currentChain?.nativeCurrency?.decimals])

  useEffect(() => {
    if (txNonce !== undefined) {
      setNonce(txNonce)
    }
  }, [txNonce, setNonce])

  useEffect(() => {
    let isCancelled = false

    const buildSafeTx = async () => {
      if (!recipient || !recipient.amount || !safeAddress || tokenDecimals == null) {
        console.info('[UnshieldAssets][Review] Skipping build - missing recipient/amount/safe/decimals', {
          hasRecipient: Boolean(recipient),
          hasAmount: Boolean(recipient?.amount),
          hasSafe: Boolean(safeAddress),
          tokenDecimals,
        })
        setSafeTx(undefined)
        setSafeTxError(undefined)
        setBatchSafeTxs(undefined)
        return
      }

      try {
        console.info('[UnshieldAssets][Review] Building shielded withdrawal SafeTx', {
          safeAddress,
          recipient: recipient.recipient,
          tokenAddress: recipient.tokenAddress,
          amount: recipient.amount,
          tokenDecimals,
        })
        setSafeTxError(undefined)

        sdk && saveStxType(STXType.Withdrawal)
        const { metaTxs, batchSafeTxs } = await buildShieldedWithdrawalMetaTxs({
          safeAddress,
          nativeAddress: safeAddress,
          tokenAddress: recipient.tokenAddress,
          tokenDecimals,
          amount: recipient.amount,
          shieldedKeyPair: keyPair,
        })

        const safeTx = await createMultiSendCallOnlyTx(metaTxs)

        if (!isCancelled) {
          console.info('[UnshieldAssets][Review] SafeTx build complete', {
            metaTxCount: metaTxs.length,
          })
          setSafeTx(safeTx)
          setSafeTxError(undefined)
          setBatchSafeTxs(batchSafeTxs.length > 0 ? batchSafeTxs : undefined)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('[UnshieldAssets][Review] Failed to build shielded deposit SafeTx', error)
          setSafeTxError(error as Error)
          setBatchSafeTxs(undefined)
        }
      }
    }

    void buildSafeTx()

    return () => {
      isCancelled = true
      setBatchSafeTxs(undefined)
    }
  }, [
    recipient,
    safeAddress,
    tokenDecimals,
    keyPair,
    setSafeTx,
    setSafeTxError,
    setBatchSafeTxs,
  ])

  return (
    <ReviewTransaction onSubmit={onSubmit}>
      {recipient && (
        <Stack divider={<Divider />} gap={2}>
          <ReviewRecipientRow params={recipient} name="Public address" />
        </Stack>
      )}

      {children}
    </ReviewTransaction>
  )
}

export default ReviewUnshieldAssets
