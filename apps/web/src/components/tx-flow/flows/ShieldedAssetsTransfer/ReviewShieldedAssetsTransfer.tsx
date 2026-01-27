import { type PropsWithChildren, useContext, useEffect, useMemo } from 'react'
import { SafeTxContext } from '../../SafeTxProvider'
import ReviewTransaction from '@/components/tx/ReviewTransactionV2'
import type { MultiTokenTransferParams } from '../TokenTransfer'
import { createMultiSendCallOnlyTx } from '@/services/tx/tx-sender'
import useSafeInfo from '@/hooks/useSafeInfo'
import useBalances from '@/hooks/useBalances'
import { sameAddress } from '@safe-global/utils/utils/addresses'
import { ZERO_ADDRESS } from '@safe-global/protocol-kit/dist/src/utils/constants'
import { Divider, Stack } from '@mui/material'
import ReviewRecipientRow from '../TokenTransfer/ReviewRecipientRow'
import { useCurrentChain } from '@/hooks/useChains'
import { STXType, useBermuda } from '@/contexts/bermuda-context'
import { TxFlowContext, type TxFlowContextType } from '../../TxFlowProvider'
import { buildShieldedTransferMetaTxs } from '@/services/bermuda/buildShieldedTransfer'

type ReviewShieldedAssetsTransferProps = {
  params?: MultiTokenTransferParams
  onSubmit: () => void
  txNonce?: number
}

const ReviewShieldedAssetsTransfer = ({
  params,
  onSubmit,
  txNonce,
  children,
}: PropsWithChildren<ReviewShieldedAssetsTransferProps>) => {
  const { safeAddress } = useSafeInfo()
  const { keyPair } = useBermuda()
  const { balances } = useBalances()
  const { setSafeTx, setSafeTxError, setNonce, setBatchSafeTxs } = useContext(SafeTxContext)
  const currentChain = useCurrentChain()
  const { sdk, saveStxInfo } = useBermuda()
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
        console.info('[ShieldAssets][Review] Skipping build - missing recipient/amount/safe/decimals', {
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
        console.info('[ShieldAssets][Review] Building shielded deposit SafeTx', {
          safeAddress,
          recipient: recipient.recipient,
          tokenAddress: recipient.tokenAddress,
          amount: recipient.amount,
          tokenDecimals,
        })
        setSafeTxError(undefined)

        const { metaTxs, batchSafeTxs, shieldedTx } = await buildShieldedTransferMetaTxs({
          safeAddress,
          shieldedAddress: recipient.recipient,
          tokenAddress: recipient.tokenAddress,
          tokenDecimals,
          amount: recipient.amount,
          shieldedKeyPair: keyPair,
        })

        sdk && saveStxInfo({type: STXType.Transfer, data: shieldedTx })

        const safeTx = await createMultiSendCallOnlyTx(metaTxs)

        if (!isCancelled) {
          console.info('[ShieldAssets][Review] SafeTx build complete', {
            metaTxCount: metaTxs.length,
          })
          setSafeTx(safeTx)
          setSafeTxError(undefined)
          setBatchSafeTxs(batchSafeTxs.length > 0 ? batchSafeTxs : undefined)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('[ShieldAssets][Review] Failed to build shielded deposit SafeTx', error)
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
    sdk,
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
          <ReviewRecipientRow params={recipient} name="Shielded address" />
        </Stack>
      )}

      {children}
    </ReviewTransaction>
  )
}

export default ReviewShieldedAssetsTransfer
