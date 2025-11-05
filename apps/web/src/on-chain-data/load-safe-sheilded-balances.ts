import { JsonRpcProvider, Contract, formatUnits, InfuraProvider } from 'ethers'
import { type Balances } from '@safe-global/store/gateway/AUTO_GENERATED/balances'
import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import { getShieldedBalance } from '@/services/bermuda/utils'

const USDC_PRICE_PER_USD = 1
const ERC_20_ABI = ['function decimals() view returns (uint8)']
const CHAINLINK_ABI = ['function decimals() view returns (uint8)', 'function latestAnswer() view returns (int256)']
const CHAINLINK_ORACLE_ADDRESS = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'

export async function loadShieldedBalances(chainId: number, keyPair: any, address: string): Promise<Balances> {
  console.log('[loadShieldedBalances] Starting with chainId:', chainId, 'address:', address)

  const bermudaSDK = getBermudaSDK()

  if (!bermudaSDK || !keyPair) {
    console.warn('[loadShieldedBalances] Bermuda SDK not initialized or shielded key missing, returning empty balances')
    return {
      fiatTotal: '0',
      items: [],
    }
  }

  console.log('[loadShieldedBalances] Bermuda SDK initialized successfully')


  const jsonRpcProvider = new JsonRpcProvider(process.env.NEXT_PUBLIC_JSON_RPC_URL)
  const infuraProvider = new InfuraProvider('mainnet', process.env.NEXT_PUBLIC_INFURA_TOKEN)

  const oracleContract = new Contract(CHAINLINK_ORACLE_ADDRESS, CHAINLINK_ABI, infuraProvider)
  const [ethPriceDecimals, ethPrice] = await Promise.all([oracleContract.decimals(), oracleContract.latestAnswer()])

  const ethPricePerUsd = Number(formatUnits(ethPrice, ethPriceDecimals))

  const wethAddress = process.env.NEXT_PUBLIC_MOCK_WETH_ADDRESS!.toLowerCase()
  const usdcAddress = process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS!.toLowerCase()
  const ethAddress = '0x0000000000000000000000000000000000000000'


  const wethContract = new Contract(wethAddress, ERC_20_ABI, jsonRpcProvider)
  const usdcContract = new Contract(usdcAddress, ERC_20_ABI, jsonRpcProvider)

  const [wethDecimals, usdcDecimals] = await Promise.all([wethContract.decimals(), usdcContract.decimals()])
  console.log('[loadShieldedBalances] Decimals - WETH:', wethDecimals, 'USDC:', usdcDecimals)

  // Get shielded balances for each token
  console.log('[loadShieldedBalances] Fetching shielded balances...')
  const [ethBalanceRaw, wethBalanceRaw, usdcBalanceRaw] = await Promise.all([
    getShieldedBalance(keyPair, ethAddress),
    getShieldedBalance(keyPair, wethAddress),
    getShieldedBalance(keyPair, usdcAddress),
  ])

  console.log('[loadShieldedBalances] Balances (raw) - ETH:', ethBalanceRaw, 'WETH:', wethBalanceRaw, 'USDC:', usdcBalanceRaw)

  const ethBalanceNum = Number(formatUnits(ethBalanceRaw, wethDecimals))
  const wethBalanceNum = Number(formatUnits(wethBalanceRaw, wethDecimals))
  const usdcBalanceNum = Number(formatUnits(usdcBalanceRaw, usdcDecimals))

  const ethFiatBalance = ethBalanceNum * ethPricePerUsd
  const wethFiatBalance = wethBalanceNum * ethPricePerUsd
  const usdcFiatBalance = usdcBalanceNum * USDC_PRICE_PER_USD
  const fiatTotal = ethFiatBalance + wethFiatBalance + usdcFiatBalance


  const balances: Balances = {
    fiatTotal: String(fiatTotal),
    items: [
      // WETH
      {
        tokenInfo: {
          type: 'ERC20',
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: Number(wethDecimals),
          address: wethAddress,
          logoUri:
            'https://safe-transaction-assets.safe.global/tokens/logos/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2.png',
        },
        balance: wethBalanceRaw.toString(),
        fiatBalance: String(wethFiatBalance),
        fiatConversion: String(ethPricePerUsd),
      },
      // USDC
      {
        tokenInfo: {
          type: 'ERC20',
          symbol: 'USDC',
          name: 'USDC Coin',
          decimals: Number(usdcDecimals),
          address: usdcAddress,
          logoUri:
            'https://safe-transaction-assets.safe.global/tokens/logos/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
        },
        balance: usdcBalanceRaw.toString(),
        fiatBalance: String(usdcFiatBalance),
        fiatConversion: String(USDC_PRICE_PER_USD),
      },
    ],
  }

  console.log('[loadShieldedBalances] Successfully loaded shielded balances')
  return balances
}
