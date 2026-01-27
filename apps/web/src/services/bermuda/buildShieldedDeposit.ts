import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import { ZERO_ADDRESS } from '@safe-global/protocol-kit/dist/src/utils/constants'
import { type MetaTransactionData } from '@safe-global/types-kit'
import { safeParseUnits } from '@safe-global/utils/utils/formatters'
import { sameAddress } from '@safe-global/utils/utils/addresses'
import { Interface } from 'ethers'
import type { BatchSafeTx } from '@/services/tx/tx-sender/dispatch'
import { getTransactAbis, simpleEncodeStx } from './utils'
import { type SafeStxHashParams } from './types'

type BuildShieldedDepositArgs = {
  safeAddress: string
  shieldedAddress: string
  tokenAddress: string
  tokenDecimals: number
  amount: string
  shieldedKeyPair?: any
}

export const buildShieldedDepositMetaTxs = async ({
  safeAddress,
  shieldedAddress,
  tokenAddress,
  tokenDecimals,
  amount,
  shieldedKeyPair,
}: BuildShieldedDepositArgs): Promise<{ metaTxs: MetaTransactionData[]; batchSafeTxs: BatchSafeTx[]; shieldedTx: SafeStxHashParams; viewingKey?: string }> => {
  console.info('[ShieldAssets][Builder] Preparing shielded deposit meta txs', {
    safeAddress,
    shieldedAddress,
    tokenAddress,
    tokenDecimals,
    amount,
  })

  const bermudaSDK = getBermudaSDK()

  if (!bermudaSDK) {
    throw new Error('Bermuda SDK not initialized')
  }

  const poolContract = bermudaSDK.config.pool

  if (!poolContract) {
    throw new Error('Bermuda pool contract not configured')
  }

  const poolAddress = await poolContract.getAddress()
  const isNativeToken = sameAddress(tokenAddress, ZERO_ADDRESS)
  const normalizedToken = (() => {
    if (!isNativeToken) {
      return tokenAddress.toLowerCase()
    }

    const wethAddress = bermudaSDK.config.mockWETH

    if (!wethAddress) {
      throw new Error('WETH address not configured for native deposits')
    }

    return wethAddress.toLowerCase()
  })()

  const parsedAmount = safeParseUnits(amount, tokenDecimals)

  if (parsedAmount === undefined) {
    throw new Error('Invalid shielded deposit amount')
  }
  console.info('[ShieldAssets][Builder] Parsed deposit amount', {
    parsedAmount: parsedAmount.toString(),
  })

  if (!shieldedAddress) {
    throw new Error('Missing shielded address')
  }

  const utxo = new bermudaSDK.types.Utxo({
    amount: parsedAmount,
    token: normalizedToken,
    keypair: shieldedKeyPair,
    type: bermudaSDK.types.UtxoType.Fund,
    safe: safeAddress
  })
  console.info('[ShieldAssets][Builder] Constructed output UTXO')

  const bogus1 = new bermudaSDK.types.Utxo({
    amount: 0n,
    token: normalizedToken,
    keypair: shieldedKeyPair,
    safe: safeAddress,
  })
  const bogus2 = new bermudaSDK.types.Utxo({
    amount: 0n,
    token: normalizedToken,
    keypair: shieldedKeyPair,
    safe: safeAddress,
  })
  const bogus3 = new bermudaSDK.types.Utxo({
    amount: 0n,
    token: normalizedToken,
    keypair: shieldedKeyPair,
    safe: safeAddress,
  })

  const inputs = [bogus1, bogus2]
  const outputs = [utxo, bogus3]

  const metaTxs: MetaTransactionData[] = []

  if (!isNativeToken) {
    const erc20Interface = new Interface(bermudaSDK.abis.ERC20_ABI)
    const approveData = erc20Interface.encodeFunctionData('approve', [poolAddress, parsedAmount])

    metaTxs.push({
      to: tokenAddress,
      data: approveData,
      value: '0',
    })
    console.info('[ShieldAssets][Builder] Added ERC20 approval meta tx')
  }

  const { args, extData } = await bermudaSDK.core.prepareTransact({
    inputs: [bogus1, bogus2],
    outputs: [utxo, bogus3],
    token: normalizedToken,
    funder: safeAddress,
    fee: 0n,
  })

  const [_args, _extData] = bermudaSDK.utils.mapTransactArgs([args, extData])

  const abi = getTransactAbis().find((abi: any) => abi.inputs.length === 2)
  const data = bermudaSDK.config.pool.interface.encodeFunctionData(
    new Interface([abi]).getFunction('transact'),
    [_args, _extData],
  )

  metaTxs.push({
    to: poolAddress,
    data,
    value: isNativeToken ? parsedAmount.toString() : '0',
  })

  const ownPubKey = BigInt(shieldedKeyPair.address().slice(0, 66))
  const stx: SafeStxHashParams = {
    token: normalizedToken,
    safe: safeAddress,
    inputNullifiers: inputs.map((u: any) => u.getNullifier()),
    amounts: outputs.map((u: any) => u.amount),
    spendingLimit: parsedAmount,
    recipient: safeAddress,
    outputPubkeys: [ownPubKey, ownPubKey],
    outputAmounts: [parsedAmount, 0n],
  }

  console.info('[ShieldAssets][Builder] Prepared final meta tx bundle', {
    metaTxCount: metaTxs.length,
    includesApproval: !isNativeToken,
  })

  const encodedStx = simpleEncodeStx(stx)
  const encryptionKey = shieldedKeyPair.x25519.secretKey
  const encryptedStx = bermudaSDK.utils.encryptMessageCiphertext(encryptionKey, encodedStx).payload
  const topic = bermudaSDK.utils.calcMessageCiphertextTopic({
    chainId: bermudaSDK.config.chainId,
    safeAddress,
    secretKey: encryptionKey
  })

  await bermudaSDK.utils.relay(bermudaSDK.config.relayer, {
    chainId: bermudaSDK.config.chainId,
    target: bermudaSDK.config.signMsgHashLib,
    data: Interface.from(bermudaSDK.abis.SIGN_MESSAGE_HASH_LIB_ABI).encodeFunctionData('messageCiphertext', [
      topic,
      encryptedStx
    ]),
  })

  return { metaTxs, batchSafeTxs: [], shieldedTx: stx, viewingKey: undefined }
}
