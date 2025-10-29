import { JsonRpcProvider, Contract, formatUnits, InfuraProvider } from 'ethers'
import { type Balances } from '@safe-global/store/gateway/AUTO_GENERATED/balances'

const ETH_DECIMALS = 18
const USDC_PRICE_PER_USD = 1
const ERC_20_ABI = [
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)',
]
const CHAINLINK_ABI = ['function decimals() view returns (uint8)', 'function latestAnswer() view returns (int256)']
const CHAINLINK_ORACLE_ADDRESS = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'

export default async function loadSafeBalances(chainId: number, address: string): Promise<Balances> {
  const jsonRpcProvider = new JsonRpcProvider(process.env.NEXT_PUBLIC_JSON_RPC_URL!)
  const infuraProvider = new InfuraProvider('mainnet', process.env.NEXT_PUBLIC_INFURA_TOKEN!)

  // Load most recent ETH price via Chainlink Oracle contract.
  const oracleContract = new Contract(CHAINLINK_ORACLE_ADDRESS, CHAINLINK_ABI, infuraProvider)
  const [ethPriceDecimals, ethPrice] = await Promise.all([oracleContract.decimals(), oracleContract.latestAnswer()])

  const ethPricePerUsd = Number(formatUnits(ethPrice, ethPriceDecimals))

  // Load ETH balance.
  const ethBalance = await jsonRpcProvider.getBalance(address)

  const ethBalanceFormatted = Number(formatUnits(ethBalance, ETH_DECIMALS))
  const ethBalanceInFiat = ethBalanceFormatted * ethPricePerUsd

  // Load WETH balance.
  const wethContract = new Contract(process.env.NEXT_PUBLIC_MOCK_WETH_ADDRESS!, ERC_20_ABI, jsonRpcProvider)

  const [wethDecimals, wethBalance] = await Promise.all([wethContract.decimals(), wethContract.balanceOf(address)])

  const wethBalanceFormatted = Number(formatUnits(wethBalance, wethDecimals))
  const wethBalanceInFiat = wethBalanceFormatted * ethPricePerUsd

  // Load USDC balance.
  const usdcContract = new Contract(process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS!, ERC_20_ABI, jsonRpcProvider)

  const [usdcDecimals, usdcBalance] = await Promise.all([usdcContract.decimals(), usdcContract.balanceOf(address)])

  const usdcBalanceFormatted = Number(formatUnits(usdcBalance, usdcDecimals))
  const usdcBalanceInFiat = usdcBalanceFormatted * USDC_PRICE_PER_USD

  const fiatTotal = [ethBalanceInFiat, wethBalanceInFiat, usdcBalanceInFiat].reduce(
    (accum, balance) => (accum += balance),
    0,
  )

  const balances: Balances = {
    fiatTotal: String(fiatTotal),
    items: [
      // ETH
      {
        tokenInfo: {
          type: 'NATIVE_TOKEN',
          symbol: 'ETH',
          name: 'Ether',
          decimals: ETH_DECIMALS,
          address: '0x0000000000000000000000000000000000000000',
          logoUri: 'https://safe-transaction-assets.safe.global/chains/1/currency_logo.png',
        },
        balance: String(ethBalance),
        fiatBalance: String(ethBalanceInFiat),
        fiatConversion: String(ethPricePerUsd),
      },
      // WETH
      {
        tokenInfo: {
          type: 'ERC20',
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: Number(wethDecimals),
          address: process.env.NEXT_PUBLIC_MOCK_WETH_ADDRESS!,
          logoUri:
            'https://safe-transaction-assets.safe.global/tokens/logos/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2.png',
        },
        balance: String(wethBalance),
        fiatBalance: String(wethBalanceInFiat),
        fiatConversion: String(ethPricePerUsd),
      },
      // USDC
      {
        tokenInfo: {
          type: 'ERC20',
          symbol: 'USDC',
          name: 'USDC Coin',
          decimals: Number(usdcDecimals),
          address: process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS!,
          logoUri:
            'https://safe-transaction-assets.safe.global/tokens/logos/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
        },
        balance: String(usdcBalance),
        fiatBalance: String(usdcBalanceInFiat),
        fiatConversion: String(USDC_PRICE_PER_USD),
      },
    ],
  }

  return balances
}
