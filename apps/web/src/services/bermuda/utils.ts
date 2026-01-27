import { ethers } from 'ethers'
import { type SafeStxHashParams } from './types'
import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import { Contract, getBytes, toBeHex, toUtf8Bytes, toUtf8String } from 'ethers'
import { decodeMultiSendData } from '@safe-global/protocol-kit/dist/src/utils/transactions/utils'

export function getTransactAbis() {
  const sdk = getBermudaSDK()
  if (!sdk) {
    throw new Error('Bermuda SDK not initialized')
  }

  return sdk.abis.POOL_ABI.filter((item: any) => {
    if (
      item.type === "function" &&
      item.name === "transact" &&
      item.outputs.length === 0 &&
      item.stateMutability === "payable"
    ) {
      return item
    }
  })
}

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
export function simpleEncodeStx(stx: any): Uint8Array {
  stx.spendingLimit = toBeHex(stx.spendingLimit)
  stx.amounts = stx.amounts.map((a: bigint) => toBeHex(a, 32))
  stx.inputNullifiers = stx.inputNullifiers.map((n: bigint) => toBeHex(n, 32))
  stx.outputPubkeys = stx.outputPubkeys.map((p: bigint) => toBeHex(p, 32))
  stx.outputAmounts = stx.outputAmounts.map((o: bigint) => toBeHex(o, 32))
  return toUtf8Bytes(JSON.stringify(stx))
}

export function simpleDecodeStx(encoded: string | Uint8Array): SafeStxHashParams {
  const s = encoded instanceof Uint8Array ? toUtf8String(encoded) : encoded
  const raw = JSON.parse(s)
  raw.spendingLimit = BigInt(raw.spendingLimit)
  raw.amounts = raw.amounts.map(BigInt)
  raw.inputNullifiers = raw.inputNullifiers.map(BigInt)
  raw.outputPubkeys = raw.outputPubkeys.map(BigInt)
  raw.outputAmounts = raw.outputAmounts.map(BigInt)
  return raw
}

export function shieldedAddressFromSpendingPubkey(outputPubkey: bigint, shieldedKeyPair?: any): Promise<string> {
  const spendingPubkey = toBeHex(outputPubkey, 32)
  if (shieldedKeyPair && shieldedKeyPair.address().startsWith(spendingPubkey)) return shieldedKeyPair.address()
  const bermudaSDK = getBermudaSDK()
  console.log("prefix", spendingPubkey)
  console.log("bermudaSDK.config.peers", bermudaSDK.config.peers)
  const shieldedAdrs = bermudaSDK.config.peers.find((shieldedAdrs: string) => shieldedAdrs.startsWith(spendingPubkey))
  if (!shieldedAdrs) throw Error('Cannot resolve shielded address')
  return shieldedAdrs
}

export async function resolveStxPreimage(keyPair: any, txHash: string) {
  const sdk = getBermudaSDK()
  if (!sdk) {
    throw new Error('Bermuda SDK not initialized')
  }

  // Get the transaction data from the `ProposeTxLib` call which potentially
  // includes the `stxHash` or `transact` function call arguments (which can be
  // set indirectly via a `MultiSend` call).
  // Then list all `MessageCiphertext` events and for each individual ciphertext
  // first try to decrypt it and check if the `stxHash` is included in the
  // aforementioned transaction data. Otherwise try to extract the function call
  // arguments from the transaction data (that can be part of a `MultiSend`
  // call) to reconstruct the stx preimage which can then be hashed to recompute
  // the `stxHash` which we then check against.
  const proposeTxLibTx = await sdk.config.provider.getTransaction(txHash)
  if (!proposeTxLibTx) {
    return undefined
  }

  const encryptionKey = keyPair.x25519.secretKey
  const publicKey = BigInt(keyPair.address().slice(0, 66))
  const signMsgHashLib = new Contract(
    sdk.config.signMsgHashLib,
    sdk.abis.SIGN_MESSAGE_HASH_LIB_ABI,
    { provider: sdk.config.provider }
  )

  const fromBlock = 0n
  const toBlock = await sdk.config.provider.getBlockNumber()

  const events = await queryFilterBatched(
    fromBlock,
    toBlock,
    signMsgHashLib,
    signMsgHashLib.filters.MessageCiphertext(null, null),
  )

  const rawProposeData = proposeTxLibTx.data
  const proposeTxLibAbi = sdk.abis.PROPOSE_TX_LIB_ABI
  const proposeTxLibInterface = new ethers.Interface(proposeTxLibAbi)
  const parsedProposeData = proposeTxLibInterface.parseTransaction({ data: rawProposeData })

  const poolAbi = sdk.abis.POOL_ABI
  const poolInterface = new ethers.Interface(poolAbi)
  const poolAddress = (await sdk.config.pool.getAddress()).toLowerCase()

  const multiSendAddress = sdk.config.multiSend.toLowerCase()
  const multiSendCallOnlyAddress = sdk.config.multiSendCallOnly.toLowerCase()

  const ciphertexts = events.map((event) => event.args.ciphertext)

  // This function extracts the stx preimage from a Pool transaction that
  // contains the data of a `transact` function invocation.
  function recomputeStxPreimage(transactTxData: string) {
    const parsedTransactData = poolInterface.parseTransaction({ data: transactTxData })

    const args = parsedTransactData!.args[0]
    const inputNullifiers = args[3]

    const extData = parsedTransactData!.args[1]
    const encryptedOutput1 = extData[4][0]
    const encryptedOutput2 = extData[4][1]
    const token = extData[6]
    const funder = extData[9]

    const { utxo: output1 } = sdk.types.Utxo.decrypt(keyPair, [], encryptedOutput1)
    const { utxo: output2 } = sdk.types.Utxo.decrypt(keyPair, [], encryptedOutput2)

    const outputs = [output1, output2]
    const amount = sdk.utils.sumAmounts(outputs)

    const stx: SafeStxHashParams = {
      token,
      safe: funder,
      inputNullifiers: inputNullifiers.map(BigInt),
      amounts: [output1.amount, output2.amount],
      recipient: funder,
      outputPubkeys: [publicKey, publicKey],
      outputAmounts: [output1.amount, output2.amount],
      spendingLimit: amount
    }

    return stx
  }

  let stx = undefined
  for (const ciphertext of ciphertexts) {
    const plaintext = sdk.utils.decryptMessageCiphertext(encryptionKey, getBytes(ciphertext))
    const stxDecoded = simpleDecodeStx(plaintext)
    const stxHash = sdk.safe.stxHash(stxDecoded)

    // 1st attempt: Try to find the `stxHash` in the `ProposeTxLib` transaction
    // data.
    if (rawProposeData.includes(stxHash.slice(2))) {
      stx = stxDecoded
      break
    }

    // 2nd attempt: Try to reconstruct stx hash based on `transact` function
    // call arguments that were passed to `ProposeTxLib` and can therefore be
    // found in its transaction data.
    const isPoolRecipient = parsedProposeData &&
      parsedProposeData.args[1][0].toLowerCase() === poolAddress

    if (isPoolRecipient) {
      const rawTransactData = parsedProposeData.args[1][2]
      const stxRecomputed = recomputeStxPreimage(rawTransactData)

      const hash = sdk.safe.stxHash(stxRecomputed)

      if (hash === stxHash) {
        stx = stxRecomputed
        break
      }
    }

    // 3rd attempt: Try to reconstruct stx hash based on `transact` function
    // call arguments that were passed to `MultiSend` and are recorded in the
    // call to `ProposeTxLib` and can therefore be found in its transaction data.
    const isMultiSendRecipient = parsedProposeData &&
      (parsedProposeData.args[1][0].toLowerCase() === multiSendAddress ||
        parsedProposeData.args[1][0].toLowerCase() === multiSendCallOnlyAddress)

    if (isMultiSendRecipient) {
      const rawMultiSendData = parsedProposeData.args[1][2]

      const transactions = decodeMultiSendData(rawMultiSendData)
      const transaction = transactions.find(tx => tx.to.toLowerCase() === poolAddress)

      if (transaction) {
        const rawTransactData = transaction.data
        const stxRecomputed = recomputeStxPreimage(rawTransactData)

        const hash = sdk.safe.stxHash(stxRecomputed)

        if (hash === stxHash) {
          stx = stxRecomputed
          break
        }
      }
    }
  }

  return stx
}

