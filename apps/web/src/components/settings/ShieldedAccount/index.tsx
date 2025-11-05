import { getBytes, Interface, toUtf8Bytes, TransactionReceipt } from 'ethers'
import useSafeInfo from '@/hooks/useSafeInfo'
import React, { useEffect, useState } from 'react'
import { useBermuda } from '@/contexts/bermuda-context'
import { deriveSeedFromPassword, shortenHex } from '@/utils/misc'
import { Paper, Grid, Typography, Box, Button, SxProps, TextField, Alert } from '@mui/material'

export default function ShieldedAccount({ sx }: { sx: SxProps }) {
  const { safeAddress } = useSafeInfo()
  const [alias, setAlias] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [aliasError, setAliasError] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [passwordError, setPasswordError] = useState<string>('')
  const [isRegistered, setIsRegistered] = useState<boolean>(false)
  const { sdk, keyPair, saveKeyPair, deleteKeyPair } = useBermuda()
  const [registerError, setRegisterError] = useState<Error | undefined>()

  useEffect(() => {
    if (keyPair) {
      async function loadAlias() {
        const shieldedAddress = keyPair.address()
        const name = await sdk.registry.nameOfShieldedAddress(shieldedAddress)

        if (name.length) {
          setAlias(name)
          setIsRegistered(true)
        }
      }

      loadAlias()
    }
  }, [keyPair])

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

    if (password.length) {
      if (password.length < 16) {
        setPasswordError('Must be at least 16 characters')
      } else if (!password.match(/[A-Z]/)) {
        setPasswordError('Must include an uppercase letter')
      } else if (!password.match(/[a-z]/)) {
        setPasswordError('Must include a lowercase letter')
      } else if (!password.match(/[0-9]/)) {
        setPasswordError('Must include a number')
      } else if (!password.match(/[~!@#$%^&*()\-_=+[\]{}\\|;:'",<.>\/?]/)) {
        setPasswordError('Must include a special character')
      } else {
        setPasswordError('')
      }
    } else {
      setPasswordError('')
    }
  }, [alias, password])

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault()

    if (password.length) {
      setIsLoading(true)

      const seed = await deriveSeedFromPassword(password)
      const keyPair = sdk.types.KeyPair.fromSeed(seed)

      saveKeyPair(keyPair)

      setIsLoading(false)
    }
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault()

    if (keyPair && alias.length && password.length) {
      setIsLoading(true)

      setAliasError('')
      setPasswordError('')
      setRegisterError(undefined)

      try {
        const shieldedAddress = keyPair.address()

        const taken = await sdk.registry.isRegistered(shieldedAddress)

        if (!taken) {
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

          setIsRegistered(true)
        }
      } catch (error: unknown) {
        setRegisterError(error as Error)
      } finally {
        setIsLoading(false)
      }
    } else if (keyPair && alias.length) {
      // Already reagistered but we are reregistering now with an alias
      const chainId = sdk.config.chainId
      const target = await sdk.config.registry.getAddress()

      const data = Interface.from([
        'function _register(address _nativeAddress, bytes calldata _shieldedAddress, bytes calldata _name) external',
      ]).encodeFunctionData('_register', [safeAddress, getBytes(keyPair.address()), toUtf8Bytes(alias)])

      const tx = await sdk.utils.relay(sdk.config.relayer, { chainId, target, data })
        .then((tx: string) => sdk.config.provider.waitForTransaction(tx))
        .then((receipt: TransactionReceipt) => {
          if (receipt.status === 0) throw new Error(`Registry Transaction ${tx} reverted`)
        })

      setIsRegistered(true)
    } else {
      if (!alias.length) setAliasError("Can't be empty")
      if (!password.length) setAliasError("Can't be empty")
      if (!keyPair) setRegisterError(new Error('KeyPair not set'))
    }
  }

  function handleLogout(event: React.FormEvent) {
    event.preventDefault()

    setAlias('')
    setPassword('')

    deleteKeyPair()
    setIsRegistered(false)
    setRegisterError(undefined)
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
        </Grid>
        <Grid item xs>
          <Box sx={{ display: 'flex' }}>
            {!keyPair ? (
              <Box
                component="form"
                onSubmit={handleLogin}
                noValidate
                sx={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}
              >
                <TextField
                  required
                  label="Password"
                  variant="outlined"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                  }}
                  disabled={isLoading}
                  error={!!passwordError}
                  helperText={passwordError}
                />
                <Button type="submit" variant="contained" disabled={isLoading || !password || !!passwordError}>
                  {!isLoading ? 'Login' : 'Loading...'}
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
                {registerError && <Alert severity="error">{registerError.message}</Alert>}
                <Typography>
                  <Box component="span" fontWeight="bold">
                    Address
                  </Box>
                  : {shortenHex(keyPair.address())}
                </Typography>
                {isRegistered && alias.length ? (
                  <Typography>
                    <Box component="span" fontWeight="bold">
                      Alias
                    </Box>
                    : {alias}
                  </Typography>
                ) : (
                  <Box
                    component="form"
                    onSubmit={handleRegister}
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
                      {!isLoading ? 'Register' : 'Loading...'}
                    </Button>
                  </Box>
                )}
                <Button type="button" variant="outlined" onClick={handleLogout}>
                  Logout
                </Button>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  )
}
