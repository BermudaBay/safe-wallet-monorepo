import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import { getBytes, hexlify, toBeHex, toUtf8Bytes, toUtf8String } from 'ethers'
import { SafeStxHashParams } from './types'

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

// : SafeStxHashParams
export function simpleEncodeStx(stx: any): string {
  stx.spendingLimit = toBeHex(stx.spendingLimit)
  stx.amounts = stx.amounts.map((a: bigint) => toBeHex(a, 32))
  stx.inputNullifiers = stx.inputNullifiers.map((n: bigint) => toBeHex(n, 32))
  stx.outputPubkeys = stx.outputPubkeys.map((p: bigint) => toBeHex(p, 32))
  stx.outputAmounts = stx.outputAmounts.map((o: bigint) => toBeHex(o, 32))
  return hexlify(toUtf8Bytes(JSON.stringify(stx)))
}

export function simpleDecodeStx(encoded: string): SafeStxHashParams {
  const raw = JSON.parse(toUtf8String(getBytes(encoded)))
  raw.spendingLimit = BigInt(raw.spendingLimit)
  raw.amounts = raw.amounts.map(BigInt)
  raw.inputNullifiers = raw.inputNullifiers.map(BigInt)
  raw.outputPubkeys = raw.outputPubkeys.map(BigInt)
  raw.outputAmounts = raw.outputAmounts.map(BigInt)
  return raw
}
