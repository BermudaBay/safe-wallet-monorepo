import { isPairingUri } from '@/features/walletconnect/services/utils'
import { WalletConnectContext, WCLoadingState } from '@/features/walletconnect/WalletConnectContext'
import { asError } from '@safe-global/utils/services/exceptions/utils'
import { getClipboard, isClipboardSupported } from '@/utils/clipboard'
import { Button, CircularProgress, InputAdornment, TextField } from '@mui/material'
import { useCallback, useContext, useEffect, useState } from 'react'

const PROPOSAL_TIMEOUT = 30_000

const WcInput = ({ uri }: { uri: string }) => {
  const { walletConnect, loading, setLoading, setError } = useContext(WalletConnectContext)
  const [value, setValue] = useState('')
  const [inputError, setInputError] = useState<Error>()

  const onInput = useCallback(
    async (val: string) => {
      if (!walletConnect) return

      setValue(val)

      if (val && !isPairingUri(val)) {
        setInputError(new Error('Invalid pairing code'))
        return
      }

      setInputError(undefined)

      if (!val) return

      setLoading(WCLoadingState.CONNECT)

      try {
        await walletConnect.connect(val)
      } catch (e) {
        setInputError(asError(e))
        setLoading(null)
      }
      setTimeout(() => {
        if (loading && loading !== WCLoadingState.APPROVE) {
          setLoading(null)
          setError(new Error('Connection timed out'))
        }
      }, PROPOSAL_TIMEOUT)
    },
    [loading, setError, setLoading, walletConnect],
  )

  // Insert a pre-filled uri
  useEffect(() => {
    if (uri) {
      onInput(uri)
    }
  }, [onInput, uri])

  const onPaste = useCallback(async () => {
    // Errors are handled by in getClipboard
    const clipboard = await getClipboard()

    if (clipboard && isPairingUri(clipboard)) {
      onInput(clipboard)
    }
  }, [onInput])

  return (
    <TextField
      data-testid="wc-input"
      value={value}
      onChange={(e) => onInput(e.target.value)}
      fullWidth
      autoComplete="off"
      autoFocus
      disabled={!!loading}
      error={!!inputError}
      label={inputError ? inputError.message : 'Pairing code'}
      placeholder="wc:"
      spellCheck={false}
      InputProps={{
        autoComplete: 'off',
        endAdornment: isClipboardSupported() ? undefined : (
          <InputAdornment position="end">
            <Button variant="contained" onClick={onPaste} sx={{ py: 1 }} disabled={!!loading}>
              {loading === WCLoadingState.CONNECT || loading === WCLoadingState.APPROVE ? (
                <CircularProgress size={20} />
              ) : (
                'Paste'
              )}
            </Button>
          </InputAdornment>
        ),
      }}
    />
  )
}

export default WcInput
