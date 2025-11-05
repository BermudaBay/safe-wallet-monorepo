import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import { ZERO_ADDRESS } from '@safe-global/protocol-kit/dist/src/utils/constants'
import type { MetaTransactionData } from '@safe-global/types-kit'
import { safeParseUnits } from '@safe-global/utils/utils/formatters'
import { sameAddress } from '@safe-global/utils/utils/addresses'
import { Interface} from 'ethers'
import { OperationType } from '@safe-global/types-kit'
import type { BatchSafeTx } from '@/services/tx/tx-sender/dispatch'

type BuildShieldedDepositArgs = {
  safeAddress: string
  shieldedAddress: string
  tokenAddress: string
  tokenDecimals: number
  amount: string
}

export const buildShieldedDepositMetaTxs = async ({
  safeAddress,
  shieldedAddress,
  tokenAddress,
  tokenDecimals,
  amount,
}: BuildShieldedDepositArgs): Promise<{ metaTxs: MetaTransactionData[]; batchSafeTxs: BatchSafeTx[]; viewingKey?: string }> => {
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

  const shieldedKeyPair = bermudaSDK.types.KeyPair.fromAddress(shieldedAddress)

  const utxo = new bermudaSDK.types.Utxo({
    amount: parsedAmount,
    token: normalizedToken,
    keypair: shieldedKeyPair,
    type: bermudaSDK.types.UtxoType.Fund,
  })
  console.info('[ShieldAssets][Builder] Constructed output UTXO')

  const { args, extData, viewingKey } = await bermudaSDK.core.prepareTransact({
    outputs: [utxo],
    token: normalizedToken,
    funder: safeAddress,
    recipient: safeAddress,
    fee: 0n,
  })
  console.info('[ShieldAssets][Builder] Prepared transact payload', {
    hasViewingKey: Boolean(viewingKey),
  })

  const [mappedArgs, mappedExtData] = bermudaSDK.utils.mapTransactArgs([args, extData])

  const TRANSACT_SIMPLE_SIGNATURE =
    'transact((bytes,bytes32[],bytes32,bytes32[],bytes32[2],uint256,bytes32,bytes,bytes32[],bytes32,uint256,bytes32),(address,int256,address,uint256,bytes,bytes,bool,address,uint256,bytes32,address))'

  const transactData = poolContract.interface.encodeFunctionData(TRANSACT_SIMPLE_SIGNATURE, [
    mappedArgs,
    mappedExtData,
  ])

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

  metaTxs.push({
    to: poolAddress,
    data: transactData,
    value: isNativeToken ? parsedAmount.toString() : '0',
  })

  console.info('[ShieldAssets][Builder] Prepared final meta tx bundle', {
    metaTxCount: metaTxs.length,
    includesApproval: !isNativeToken,
  })

  const batchSafeTxs: BatchSafeTx[] = metaTxs.map((metaTx) => ({
    to: metaTx.to,
    data: metaTx.data ?? '0x',
    value: BigInt(metaTx.value ?? '0'),
    operation: Number(metaTx.operation ?? OperationType.Call),
  }))

  return { metaTxs, batchSafeTxs, viewingKey }
}
