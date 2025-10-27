import { useEffect } from 'react'
import { useChainsGetChainsV1Query } from '@safe-global/store/gateway/AUTO_GENERATED/chains'
import { Errors, logError } from '@/services/exceptions'
import type { ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'
import type { AsyncResult } from '@safe-global/utils/hooks/useAsync'
import { GAS_PRICE_TYPE, RPC_AUTHENTICATION, FEATURES } from '@safe-global/safe-gateway-typescript-sdk'

type HexString = `0x${string}`

const MAX_CHAINS = 40

export const useLoadChains = () => {
  const { data, isLoading, error } = useChainsGetChainsV1Query({ cursor: `limit=${MAX_CHAINS}` })

  let chains: ChainInfo[] = []

  if (data && data.results) {
    chains = structuredClone(data.results as ChainInfo[])

    chains.push({
      chainId: '31337',
      chainName: 'Devnet',
      shortName: 'dev',
      isTestnet: true,
      description: '',
      rpcUri: {
        authentication: RPC_AUTHENTICATION.NO_AUTHENTICATION,
        value: 'http://localhost:8545',
      },
      publicRpcUri: {
        authentication: RPC_AUTHENTICATION.NO_AUTHENTICATION,
        value: 'http://localhost:8545',
      },
      safeAppsRpcUri: {
        authentication: RPC_AUTHENTICATION.NO_AUTHENTICATION,
        value: 'http://localhost:8545',
      },
      disabledWallets: [],
      theme: {
        textColor: '#ffffff',
        backgroundColor: '#627EEA',
      },
      blockExplorerUriTemplate: {
        address: 'http://localhost:4194/address/{{address}}',
        txHash: 'http://localhost:4194/tx/{{txHash}}',
        api: '',
      },
      gasPrice: [
        {
          type: GAS_PRICE_TYPE.UNKNOWN,
        },
      ],
      balancesProvider: {
        chainName: 'devnet',
        enabled: false,
      },
      features: [
        FEATURES.EIP1559,
        FEATURES.ERC721,
        FEATURES.SAFE_APPS,
        FEATURES.CONTRACT_INTERACTION,
        FEATURES.TX_SIMULATION,
      ],
      nativeCurrency: {
        name: 'Go',
        symbol: 'GO',
        decimals: 18,
        logoUri: 'https://safe-transaction-assets.staging.5afe.dev/chains/1337/currency_logo.png',
      },
      transactionService: '',
      chainLogoUri: 'https://safe-transaction-assets.staging.5afe.dev/chains/1/chain_logo.png',
      l2: false,
      contractAddresses: {
        safeSingletonAddress: process.env.NEXT_PUBLIC_MASTERCOPY! as HexString,
        safeProxyFactoryAddress: process.env.NEXT_PUBLIC_PROXY_FACTORY! as HexString,
        safeWebAuthnSignerFactoryAddress: null,
        multiSendAddress: process.env.NEXT_PUBLIC_MULTI_SEND_LIB! as HexString,
        multiSendCallOnlyAddress: process.env.NEXT_PUBLIC_MULTI_SEND_CALL_ONLY_LIB! as HexString,
        createCallAddress: process.env.NEXT_PUBLIC_CREATE_CALL_LIB! as HexString,
        fallbackHandlerAddress: process.env.NEXT_PUBLIC_EXTENSIBLE_FALLBACK_HANDLER! as HexString,
        signMessageLibAddress: process.env.NEXT_PUBLIC_SIGN_MSG_LIB! as HexString,
        simulateTxAccessorAddress: process.env.NEXT_PUBLIC_SIMULATE_TX_ACCESSOR! as HexString,
      },
      recommendedMasterCopyVersion: '1.5.0',
    })
  }

  // Log errors
  useEffect(() => {
    if (error) {
      logError(Errors._620, error.toString())
    }
  }, [error])

  return [chains, error, isLoading] as AsyncResult<ChainInfo[]>
}

export default useLoadChains
