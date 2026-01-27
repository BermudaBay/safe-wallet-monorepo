import { shortenHex } from '@/utils/misc'
import { copyToClipboard } from './utils'
import useSafeInfo from '@/hooks/useSafeInfo'
import { useSigner } from '@/hooks/wallets/useWallet'
import { useWeb3ReadOnly } from '@/hooks/wallets/web3'
import { OperationType } from '@safe-global/types-kit'
import { useBermuda } from '@/contexts/bermuda-context'
import React, { useEffect, useMemo, useState } from 'react'
import { txDispatch, TxEvent } from '@/services/tx/txEvents'
import { getSafeTxHash } from '@/services/tx/tx-sender/utils'
import { BrowserProvider, Interface, ZeroAddress, getBytes } from 'ethers'
import {
  buildDeployment,
  calcAddress,
  CREATE_CALL_LIB,
  createCeremonyHelper,
  getOwners,
  isDeployed,
  isReady as isMpecdhReady,
} from '@/services/mpecdh'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  SxProps,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'

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
  const [currentRound, setCurrentRound] = useState<number | null>(null)
  const [totalRounds, setTotalRounds] = useState<number | null>(null)
  const [hasContributed, setHasContributed] = useState<boolean>(false)

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

  const canContribute = useMemo(() => {
    if (!signer?.address) return false
    if (mpecdhAddress && !isReady && blocking.length === 0) return true
    return blocking.some((addr) => addr.toLowerCase() === signer.address.toLowerCase())
  }, [signer?.address, blocking, mpecdhAddress, isReady])

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

  async function refreshStatus() {
    if (!mpecdhAddress || !browserProvider || !signer) return
    try {
      const ceremony_helper = await createCeremonyHelper(mpecdhAddress, browserProvider)
      const ethersSigner = await browserProvider.getSigner()
      const current = await ceremony_helper.status(ethersSigner)
      setStatus(current)
      const blockingList = await ceremony_helper.blocking()
      setBlocking(blockingList)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (isReady) {
      setHasContributed(false)
    }
  }, [isReady])

  useEffect(() => {
    if (signer && canContribute) {
      setHasContributed(false)
    }
  }, [signer, canContribute])

  useEffect(() => {
    if (isReady && !keyPair && !isLoading && mpecdhAddress && browserProvider && signer && sdk) {
      const deriveSeed = async () => {
        setIsLoading(true)
        setDeriveError(undefined)
        try {
          const helper = await createCeremonyHelper(mpecdhAddress, browserProvider)
          const ethersSigner = await browserProvider.getSigner()
          const seedHex = await helper.stepX(ethersSigner)
          const seed = getBytes(seedHex)
          const nextKeyPair = sdk.types.KeyPair.fromSeed(seed)
          const shieldedAddress = nextKeyPair.address()
          const isRegistered = await sdk.registry.isRegistered(shieldedAddress)

          if (!isRegistered) {
            const chainId = sdk.config.chainId
            const target = await sdk.config.registry.getAddress()
            const data = Interface.from([
              'function _register(address _nativeAddress, bytes calldata _shieldedAddress, bytes calldata _name) external',
            ]).encodeFunctionData('_register', [
              safeAddress,
              Buffer.from(shieldedAddress.replace('0x', ''), 'hex'),
              Buffer.alloc(0),
            ])
            const tx = await sdk.utils.relay(sdk.config.relayer, { chainId, target, data })
            const receipt = await sdk.config.provider.waitForTransaction(tx)
            if (receipt.status === 0) {
              throw new Error(`Registry Transaction ${tx} reverted`)
            }
          }

          const nativeAddress = await sdk.registry.nativeAddressOf(shieldedAddress)
          if (nativeAddress.toLowerCase() !== safeAddress.toLowerCase()) {
            throw new Error('KeyPair already registered with different Safe')
          }

          saveKeyPair(nextKeyPair)
        } catch (error: unknown) {
          setDeriveError(error as Error)
        } finally {
          setIsLoading(false)
        }
      }
      void deriveSeed()
    }
  }, [isReady, keyPair, isLoading, mpecdhAddress, browserProvider, signer, sdk, safeAddress])

  useEffect(() => {
    void refreshStatus()
  }, [mpecdhAddress, browserProvider, signer, hasContributed])

  async function refreshRoundInfo() {
    if (!mpecdhAddress || !browserProvider || !signer || isReady) return

    try {
      const owners = await getOwners(safeAddress, browserProvider)
      const total = owners.length - 1
      setTotalRounds(total)

      const { Contract } = await import('ethers')
      const mpecdhContract = new Contract(
        mpecdhAddress,
        [
          'function processed(uint256) public view returns (uint256)',
          'function source(address) public view returns (uint256)',
        ],
        browserProvider,
      )

      const signerSlot = await mpecdhContract.source(signer.address)
      const processedCount = await mpecdhContract.processed(signerSlot)

      const current = Number(processedCount) + 1

      if (current <= total) {
        setCurrentRound(current)
      }
    } catch (error) {
      console.error('Failed to fetch round info', error)
    }
  }
  useEffect(() => {
    void refreshRoundInfo()
  }, [mpecdhAddress, browserProvider, isReady, blocking])

  async function handleContribute(event: React.FormEvent) {
    event.preventDefault()
    if (!mpecdhAddress || !browserProvider || !signer) {
      setRegisterError(new Error('Connect a signer and ensure MPECDH is deployed'))
      return
    }
    setIsLoading(true)
    setRegisterError(undefined)
    setDeriveError(undefined)
    try {
      const ceremony_helper = await createCeremonyHelper(mpecdhAddress, browserProvider)
      const ethersSigner = await browserProvider.getSigner()
      const current = await ceremony_helper.status(ethersSigner)
      let txResponse: any
      if (current === 3) {
        txResponse = await ceremony_helper.step0(ethersSigner)
      } else if (current === 1) {
        txResponse = await ceremony_helper.stepN(ethersSigner)
      } else {
        setRegisterError(new Error('No contribution needed right now'))
        return
      }

      if (txResponse?.hash) {
        await browserProvider.waitForTransaction(txResponse.hash)
      }

      setHasContributed(true)
      await refreshStatus()
      await refreshMpecdhState()
    } catch (error: unknown) {
      setRegisterError(error as Error)
      setHasContributed(false)
    } finally {
      setIsLoading(false)
    }
  }

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

      const safeNonce = safe.nonce
      const tx = {
        value: 0n,
        operation: OperationType.Call,
        safeTxGas: 0n,
        baseGas: 0n,
        gasPrice: 0n,
        gasToken: ZeroAddress,
        refundReceiver: ZeroAddress,
        nonce: safeNonce,
        ...txData,
      }
      const safeTxHash = await getSafeTxHash(safeAddress, tx)
      console.log('safeTxHash', safeTxHash)
      const ownerSigner = ethersSigner
      const proposePayload = await sdk.safe.proposePayload(safeAddress, txData, ownerSigner)
      console.log('proposePayload', proposePayload)
      const txResponse = await ownerSigner.sendTransaction(proposePayload)

      setDeploymentHash(txResponse.hash)
      console.log('txResponse', txResponse)
      await sdk.config.provider.waitForTransaction(txResponse.hash)

      txDispatch(safeTxHash ? TxEvent.SIGNATURE_PROPOSED : TxEvent.PROPOSED, {
        txId: safeTxHash,
        signerAddress: ownerSigner.address,
        nonce: safeNonce,
      })
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

  const isDeploymentPending = useMemo(() => {
    if (mpecdhAddress) return false
    if (deploymentHash) return true

    if (pendingTxs.length > 0 && expectedAddress && CREATE_CALL_LIB) {
      const createCallLib = CREATE_CALL_LIB.toLowerCase()
      console.log('pendingTxs', pendingTxs)
      console.log(
        'createCallLib',
        pendingTxs.some((tx: any) => tx.details?.[0]?.toLowerCase() === createCallLib),
      )
      return pendingTxs.some((tx: any) => tx.details?.[0]?.toLowerCase() === createCallLib)
    }

    return false
  }, [mpecdhAddress, deploymentHash, pendingTxs, expectedAddress])

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
            {deploymentHash && (
              <Typography variant="body2" title={deploymentHash}>
                Deployment tx: <code>{shortenHex(deploymentHash, 6)}</code>
              </Typography>
            )}
            {blocking.length > 0 && (
              <Typography variant="body2">
                Blocking Address: {blocking.map((addr: string) => shortenHex(addr, 4)).join(', ')}
              </Typography>
            )}
            {mpecdhAddress && !isReady && currentRound !== null && totalRounds !== null && (
              <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                Current round: {currentRound} | TotalRounds: {totalRounds}
              </Typography>
            )}
          </Stack>
          <Box
            sx={{
              p: 2,
              mt: 2,
              backgroundColor: 'background.paper',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'block' }}>
              How to set up your Safe's shielded account?
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'block', mt: 0.5 }}
            >
              1. Deploy a multi-party key exchange coordination contract for your Safe (owners)
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'block' }}>
              2. Contribute to ceremony ({safe.owners.length - 1} {safe.owners.length - 1 === 1 ? 'round' : 'rounds'})
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'block' }}>
              3. Derive seed
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'block' }}>
              4. Optionally register a name.bay alias for your shielded address
            </Typography>
          </Box>
        </Grid>
        <Grid item xs>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', mt: 4, alignItems: 'center' }}>
            {registerError && <Alert severity="error">{registerError.message}</Alert>}
            {deriveError && <Alert severity="error">{deriveError.message}</Alert>}

            {!mpecdhAddress && (
              <Box
                component="form"
                onSubmit={handleDeploy}
                sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}
              >
                <Tooltip
                  title={
                    isDeploymentPending
                      ? 'Deployment transaction is pending. Check the Transactions list to approve and execute.'
                      : 'Deploy the MPECDH contract via Safe multisig transaction'
                  }
                  arrow
                >
                  <span>
                    <Button type="submit" variant="contained" disabled={isLoading || isDeploymentPending}>
                      {isDeploymentPending ? 'Deployment Pending...' : 'Deploy MPECDH'}
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            )}

            {mpecdhAddress && (
              <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" justifyContent="center">
                {!isReady && (
                  <>
                    <Tooltip
                      title={
                        !canContribute
                          ? 'Wait for the blocking address to contribute.'
                          : 'Submit your contribution for the current round'
                      }
                      arrow
                    >
                      <span>
                        <Button
                          variant="outlined"
                          onClick={handleContribute}
                          disabled={isLoading || !canContribute || (hasContributed && blocking.length > 0)}
                        >
                          Contribute
                        </Button>
                      </span>
                    </Tooltip>
                    {isLoading && !hasContributed && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <CircularProgress size={16} />
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                          Submitting contribution...
                        </Typography>
                      </Box>
                    )}
                    {hasContributed && (
                      <Typography variant="body2" sx={{ color: 'success.main', fontSize: '0.875rem' }}>
                        Contribution submitted.
                      </Typography>
                    )}
                  </>
                )}
                {isReady && !keyPair && isLoading && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      Deriving seed...
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {keyPair ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '320px' }}>
                {registerAliasError && <Alert severity="error">{registerAliasError.message}</Alert>}
                <Typography
                  title="Click to copy"
                  onClick={(e) => copyToClipboard(keyPair.address(), e)}
                  sx={{ cursor: 'copy' }}
                >
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
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Complete the shielded account setup to enable shielded transactions.
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  )
}
