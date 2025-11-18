import React, { useEffect, useMemo, useState } from 'react'
import { BrowserProvider, Interface, ZeroAddress, getBytes } from 'ethers'
import { Alert, Box, Button, Grid, Paper, Stack, SxProps, TextField, Typography } from '@mui/material'
import useSafeInfo from '@/hooks/useSafeInfo'
import { useBermuda } from '@/contexts/bermuda-context'
import { shortenHex } from '@/utils/misc'
import { copyToClipboard } from './utils'
import { useSigner } from '@/hooks/wallets/useWallet'
import { useWeb3ReadOnly } from '@/hooks/wallets/web3'
import {
  buildDeployment,
  calcAddress,
  createCeremonyHelper,
  getBlocking,
  getOwners,
  isDeployed,
  isReady as isMpecdhReady,
} from '@/services/mpecdh'

export default function ShieldedAccount({ sx }: { sx: SxProps }) {
  const { safe, safeAddress } = useSafeInfo()
  const { sdk, keyPair, saveKeyPair, deleteKeyPair } = useBermuda()
  const signer = useSigner()
  const web3ReadOnly = useWeb3ReadOnly()

  const [alias, setAlias] = useState<string>('')
  const [aliasError, setAliasError] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [registerError, setRegisterError] = useState<Error | undefined>()
  const [registerAliasError, setRegisterAliasError] = useState<Error | undefined>()
  const [isAliasRegistered, setIsAliasRegistered] = useState<boolean>(false)
  const [mpecdhAddress, setMpecdhAddress] = useState<string | null>(null)
  const [expectedAddress, setExpectedAddress] = useState<string | null>(null)
  const [deploymentHash, setDeploymentHash] = useState<string | null>(null)
  const [pendingTxs, setPendingTxs] = useState<any[]>([])
  const [status, setStatus] = useState<number | null>(null)
  const [blocking, setBlocking] = useState<string[]>([])
  const [isReady, setIsReady] = useState<boolean>(false)
  const [deriveError, setDeriveError] = useState<Error | undefined>()

  const browserProvider = useMemo(() => {
    const baseProvider = signer?.provider as any
    if (!baseProvider || typeof baseProvider.request !== 'function') return undefined
    try {
      return new BrowserProvider(baseProvider)
    } catch {
      return undefined
    }
  }, [signer])

  // Load alias if already registered
  useEffect(() => {
    if (sdk && keyPair && !isAliasRegistered) {
      async function loadAlias() {
        const shieldedAddress = keyPair.address()
        const name = await sdk.registry.nameOfShieldedAddress(shieldedAddress)

        if (name.length) {
          setAlias(name)
          setIsAliasRegistered(true)
        }
      }

      void loadAlias()
    }
  }, [sdk, keyPair, isAliasRegistered])

  useEffect(() => {
    if (alias.length) {
      const name = alias.substring(0, alias.length - 4)

      if (!alias.endsWith('.bay')) {
        setAliasError('Must end with .bay')
      } else if (name.length < 3) {
        setAliasError('Must be at least 3 characters')
      } else {
        setAliasError('')
      }
    } else {
      setAliasError('')
    }
  }, [alias])

  async function refreshMpecdhState() {
    if (!safeAddress) return
    const provider = web3ReadOnly ?? browserProvider
    if (!provider) {
      setRegisterError(new Error('Connect a wallet'))
      return
    }
    try {
      const owners = await getOwners(safeAddress, provider)
      const expected = calcAddress(safeAddress, owners)
      setExpectedAddress(expected)
      const code = await provider.getCode(expected)
      const deployed = code && code !== '0x' ? expected : await isDeployed(safeAddress, provider)
      setMpecdhAddress(deployed)
      if (deployed) {
        const readyFlag = await isMpecdhReady(safeAddress, provider)
        setIsReady(readyFlag)
      } else {
        setIsReady(false)
      }
      console.log('[MPECDH] expected', expected)
      console.log('[MPECDH] deployed', deployed, 'isReady', isReady)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    void refreshMpecdhState()
  }, [safeAddress, web3ReadOnly, browserProvider])

  async function refreshLocalQueue() {
    if (!sdk || !safeAddress) return
    try {
      const owner = signer?.address
      const { pending } = await sdk.safe.listTxs(safeAddress, owner)
      setPendingTxs(pending)
    } catch (error) {
      console.error('Failed to load local queue', error)
    }
  }

  useEffect(() => {
    void refreshLocalQueue()
  }, [sdk, safeAddress, signer])

  async function handleDeploy(event: React.FormEvent) {
    event.preventDefault()
    if (!browserProvider || !signer || !sdk) {
      setRegisterError(new Error('Connect a signer wallet'))
      return
    }
    setIsLoading(true)
    setRegisterError(undefined)
    try {
      const ethersSigner = await browserProvider.getSigner()
      const owners = await getOwners(safeAddress, web3ReadOnly ?? browserProvider)
      const txData = buildDeployment(safeAddress, owners)
      const ownerSigner = ethersSigner
      const proposePayload = await sdk.safe.proposePayload(safeAddress, txData, ownerSigner)
      const receipt = await ownerSigner.sendTransaction(proposePayload)
      setDeploymentHash(receipt.hash)
      await refreshMpecdhState()
      await refreshLocalQueue()
    } catch (error: unknown) {
      setRegisterError(error as Error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRegisterAlias(event: React.FormEvent) {
    event.preventDefault()

    if (keyPair && alias.length) {
      setIsLoading(true)
      setAliasError('')
      setRegisterAliasError(undefined)

      try {
        const shieldedAddress = keyPair.address()

        const chainId = sdk.config.chainId
        const target = await sdk.config.registry.getAddress()

        const data = Interface.from([
          'function _register(address _nativeAddress, bytes calldata _shieldedAddress, bytes calldata _name) external',
        ]).encodeFunctionData('_register', [
          safeAddress,
          Buffer.from(shieldedAddress.replace('0x', ''), 'hex'),
          Buffer.from(alias, 'utf-8'),
        ])

        const tx = await sdk.utils.relay(sdk.config.relayer, {
          chainId,
          target,
          data,
        })

        const receipt = await sdk.config.provider.waitForTransaction(tx)
        if (receipt.status === 0) {
          throw new Error(`Registry Transaction ${tx} reverted`)
        }

        setAlias('')
        setIsAliasRegistered(true)
      } catch (error: unknown) {
        setRegisterAliasError(error as Error)
      } finally {
        setIsLoading(false)
      }
    } else {
      if (!alias.length) setAliasError("Can't be empty")
      if (!keyPair) setRegisterAliasError(new Error('KeyPair not set'))
    }
  }

  function handleLogout(event: React.FormEvent) {
    event.preventDefault()

    setAlias('')
    deleteKeyPair()
    setIsAliasRegistered(false)
    setRegisterError(undefined)
    setRegisterAliasError(undefined)
  }

  return (
    <Paper sx={{ padding: 4, ...sx }}>
      <Grid
        container
        direction="row"
        spacing={3}
        sx={{
          justifyContent: 'space-between',
        }}
      >
        <Grid item lg={4} xs={12}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
            }}
          >
            Shielded account
          </Typography>
          <Stack direction="column" spacing={1} mt={2}>
            {expectedAddress && (
              <Typography variant="body2">
                Expected MPECDH: <code>{shortenHex(expectedAddress, 6)}</code>
              </Typography>
            )}
            {mpecdhAddress && (
              <Typography variant="body2" title={mpecdhAddress}>
                Deployed at: <code>{shortenHex(mpecdhAddress, 6)}</code>
              </Typography>
            )}
            {deploymentHash && (
              <Typography variant="body2" title={deploymentHash}>
                Deployment tx: <code>{shortenHex(deploymentHash, 6)}</code>
              </Typography>
            )}
            {pendingTxs.length > 0 &&
              pendingTxs.map((item) => (
                <Typography key={item.hash} variant="body2" title={item.hash}>
                  Pending: <code>{shortenHex(item.hash, 6)}</code> – {item.confirmationStatus}
                </Typography>
              ))}
            {blocking.length > 0 && (
              <Typography variant="body2">
                Blocking: {blocking.map((addr: string) => shortenHex(addr, 4)).join(', ')}
              </Typography>
            )}
            {status !== null && <Typography variant="body2">Ceremony status: {status}</Typography>}
          </Stack>
        </Grid>
        <Grid item xs>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
            {registerError && <Alert severity="error">{registerError.message}</Alert>}

            <Box component="form" onSubmit={handleDeploy} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button type="submit" variant="contained" disabled={isLoading || !!mpecdhAddress}>
                {mpecdhAddress ? 'MPECDH Deployed' : 'Deploy MPECDH'}
              </Button>
              <Typography variant="body2">
                Creates Safe transaction to deploy the SafeMPECDH contract via standard multisig flow.
              </Typography>
            </Box>

            {keyPair ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '320px' }}>
                {registerAliasError && <Alert severity="error">{registerAliasError.message}</Alert>}
                <Typography title="Click to copy" onClick={(e) => copyToClipboard(keyPair.address(), e)} sx={{ cursor: 'copy' }}>
                  <Box component="span" fontWeight="bold">
                    Address
                  </Box>
                  : {shortenHex(keyPair.address())}
                </Typography>
                {isAliasRegistered && alias.length ? (
                  <Typography>
                    <Box component="span" fontWeight="bold">
                      Alias
                    </Box>
                    : {alias}
                  </Typography>
                ) : (
                  <Box
                    component="form"
                    onSubmit={handleRegisterAlias}
                    sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                  >
                    <TextField
                      label="Alias"
                      variant="outlined"
                      value={alias}
                      onChange={(e) => {
                        setAlias(e.target.value)
                      }}
                      disabled={isLoading}
                      error={!!aliasError}
                      placeholder="Optional .bay name"
                      helperText={aliasError}
                    />
                    <Button type="submit" variant="contained" disabled={isLoading || !alias || !!aliasError}>
                      {!isLoading ? 'Register Alias' : 'Loading...'}
                    </Button>
                  </Box>
                )}
                <Button type="button" variant="outlined" onClick={handleLogout} disabled={isLoading}>
                  Logout
                </Button>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Derive the shielded seed through the MPECDH ceremony to unlock alias registration.
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  )
}
