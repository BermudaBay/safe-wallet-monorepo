import { JsonRpcProvider, Contract, formatUnits, InfuraProvider } from 'ethers'
import { type Balances } from '@safe-global/store/gateway/AUTO_GENERATED/balances'
import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import { getShieldedBalance } from '@/services/bermuda/utils'

const USDC_PRICE_PER_USD = 1
const ERC_20_ABI = ['function decimals() view returns (uint8)']
const CHAINLINK_ABI = ['function decimals() view returns (uint8)', 'function latestAnswer() view returns (int256)']
const CHAINLINK_ORACLE_ADDRESS = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'

export async function loadShieldedBalances(chainId: number, keypairSeed: bigint, address: string): Promise<Balances> {
  console.log('[loadShieldedBalances] Starting with chainId:', chainId, 'address:', address)

  const bermudaSDK = getBermudaSDK()

  if (!bermudaSDK) {
    console.warn('[loadShieldedBalances] Bermuda SDK not initialized, returning empty balances')
    return {
      fiatTotal: '0',
      items: [],
    }
  }

  console.log('[loadShieldedBalances] Bermuda SDK initialized successfully')


  const jsonRpcProvider = new JsonRpcProvider(process.env.NEXT_PUBLIC_JSON_RPC_URL)
  const infuraProvider = new InfuraProvider('mainnet', process.env.NEXT_PUBLIC_INFURA_TOKEN)

  const shieldedKeyPair = new bermudaSDK.types.KeyPair(keypairSeed)

  const oracleContract = new Contract(CHAINLINK_ORACLE_ADDRESS, CHAINLINK_ABI, infuraProvider)
  const [ethPriceDecimals, ethPrice] = await Promise.all([oracleContract.decimals(), oracleContract.latestAnswer()])

  const ethPricePerUsd = Number(formatUnits(ethPrice, ethPriceDecimals))

  const wethAddress = process.env.NEXT_PUBLIC_MOCK_WETH_ADDRESS!
  const usdcAddress = process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS!
  const ethAddress = '0x0000000000000000000000000000000000000000'


  const wethContract = new Contract(wethAddress, ERC_20_ABI, jsonRpcProvider)
  const usdcContract = new Contract(usdcAddress, ERC_20_ABI, jsonRpcProvider)

  const [wethDecimals, usdcDecimals] = await Promise.all([wethContract.decimals(), usdcContract.decimals()])
  console.log('[loadShieldedBalances] Decimals - WETH:', wethDecimals, 'USDC:', usdcDecimals)

  // Get shielded balances for each token
  console.log('[loadShieldedBalances] Fetching shielded balances...')
  const [ethBalance, wethBalance, usdcBalance] = await Promise.all([
    getShieldedBalance(shieldedKeyPair, ethAddress, wethDecimals),
    getShieldedBalance(shieldedKeyPair, wethAddress, wethDecimals),
    getShieldedBalance(shieldedKeyPair, usdcAddress, usdcDecimals),
  ])

  console.log('[loadShieldedBalances] Balances - ETH:', ethBalance, 'WETH:', wethBalance, 'USDC:', usdcBalance)

  const ethBalanceNum = Number(ethBalance)
  const wethBalanceNum = Number(wethBalance)
  const usdcBalanceNum = Number(usdcBalance)

  const ethFiatBalance = ethBalanceNum * ethPricePerUsd
  const wethFiatBalance = wethBalanceNum * ethPricePerUsd
  const usdcFiatBalance = usdcBalanceNum * USDC_PRICE_PER_USD
  const fiatTotal = ethFiatBalance + wethFiatBalance + usdcFiatBalance


  const balances: Balances = {
    fiatTotal: String(fiatTotal),
    items: [
      // ETH
      {
        tokenInfo: {
          type: 'NATIVE_TOKEN',
          symbol: 'ETH',
          name: 'Ether',
          decimals: Number(wethDecimals),
          address: ethAddress,
          logoUri: 'https://safe-transaction-assets.safe.global/chains/1/currency_logo.png',
        },
        balance: String(ethBalanceNum),
        fiatBalance: String(ethFiatBalance),
        fiatConversion: String(ethPricePerUsd),
      },
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
        balance: String(wethBalanceNum),
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
        balance: String(usdcBalanceNum),
        fiatBalance: String(usdcFiatBalance),
        fiatConversion: String(USDC_PRICE_PER_USD),
      },
    ],
  }

  console.log('[loadShieldedBalances] Successfully loaded shielded balances')
  return balances
}
