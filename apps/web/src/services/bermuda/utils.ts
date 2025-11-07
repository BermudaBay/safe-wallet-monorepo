import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'

export async function getShieldedBalance(shieldedKeyPair: any, token: string): Promise<bigint> {
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
    .then((amount: bigint) => amount ?? 0n)
}

export async function queryFilterBatched(
  fromBlock: bigint,
  toBlock: bigint,
  contract: any,
  filter: any
): Promise<any[]> {
  const batchSize = 1000n
  let batchedEvents: any[] = []
  let i = fromBlock
  let batchToBlock
  const currentBlockNumber = await contract.runner.provider.getBlockNumber()
  // eslint-disable-next-line no-constant-condition
  while (true) {
    batchToBlock = i + batchSize
    if (batchToBlock > currentBlockNumber) {
      batchToBlock = currentBlockNumber
    }
    const events = await contract.queryFilter(filter, i, batchToBlock)
    batchedEvents = [...batchedEvents, ...events]
    i += batchSize
    if (i >= toBlock) {
      break
    }
  }
  return batchedEvents
}