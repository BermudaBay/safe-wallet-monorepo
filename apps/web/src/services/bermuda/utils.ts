import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import { formatUnits } from 'ethers'

export async function getShieldedBalance(shieldedKeyPair: any, token: string, decimals: number): Promise<number> {
  token = token.toLowerCase()
  const bermudaSDK = getBermudaSDK()
  if (!bermudaSDK) {
    throw new Error('Bermuda SDK not initialized')
  }
  return bermudaSDK.utils
    .findUtxos({
      pool: bermudaSDK.config.pool,
      keypair: shieldedKeyPair,
      peers: [
        /*empty since we won't need to decrypt stx history, i.e. historical, spent UTXOs*/
      ],
      tokens: [token],
      excludeSpent: true,
      excludeOthers: true,
      from: bermudaSDK.config.startBlock,
    })
    .then((found: any) => bermudaSDK.utils.sumAmounts(found[token]))
    .then(async (amount: any) => Number(formatUnits(amount, decimals)))
}
