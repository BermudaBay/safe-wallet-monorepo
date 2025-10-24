import { useCallback, useContext, useEffect } from 'react'
import { WalletConnectContext } from '@/features/walletconnect/WalletConnectContext'
import WcConnectionForm from '../WcConnectionForm'
import WcErrorMessage from '../WcErrorMessage'
import WcProposalForm from '../WcProposalForm'
import WcChainSwitchModal from '../WcChainSwitchModal'
import { wcChainSwitchStore } from '../WcChainSwitchModal/store'

type WcSessionManagerProps = {
  uri: string
}

const WcSessionManager = ({ uri }: WcSessionManagerProps) => {
  const { sessions, sessionProposal, error, setError, open, approveSession, rejectSession } =
    useContext(WalletConnectContext)
  const chainSwitchRequest = wcChainSwitchStore.useStore()

  useEffect(() => {
    if (!open && chainSwitchRequest) {
      chainSwitchRequest.onCancel()
    }
  }, [open, chainSwitchRequest])

  // On session approve
  const onApprove = useCallback(async () => {
    if (!sessionProposal) return

    try {
      await approveSession()
    } catch (e) {
      setError(e as Error)
      return
    }
  }, [sessionProposal, approveSession, setError])

  // On session reject
  const onReject = useCallback(async () => {
    if (!sessionProposal) return

    try {
      await rejectSession()
    } catch (e) {
      setError(e as Error)
    }
  }, [sessionProposal, rejectSession, setError])

  // Reset error
  const onErrorReset = useCallback(() => {
    setError(null)
  }, [setError])

  // Nothing to show
  if (!open && !chainSwitchRequest) return null

  if (chainSwitchRequest) {
    return (
      <WcChainSwitchModal
        appInfo={chainSwitchRequest.appInfo}
        chain={chainSwitchRequest.chain}
        safes={chainSwitchRequest.safes}
        onSelectSafe={chainSwitchRequest.onSelectSafe}
        onCancel={chainSwitchRequest.onCancel}
      />
    )
  }

  // Error
  if (error) {
    return <WcErrorMessage error={error} onClose={onErrorReset} />
  }

  // Session proposal
  if (sessionProposal) {
    return <WcProposalForm proposal={sessionProposal} onApprove={onApprove} onReject={onReject} />
  }

  // Connection form (initial state)
  return <WcConnectionForm sessions={sessions} uri={uri} />
}

export default WcSessionManager
