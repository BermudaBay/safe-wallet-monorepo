export type SdkSafeTx = {
  to: string
  data: string
  value: string
  operation: number
  safeTxGas: string
  baseGas: string
  gasPrice: string
  gasToken: string
  refundReceiver: string
  nonce: number
}

export type SdkSafeTxInfo = {
  hash: string
  details: SdkSafeTx
  signatures: Record<string, string>
  executed: boolean
  stxExecuted?: boolean
  txHash?: string
}

export type SdkListTxsResult = {
  all: SdkSafeTxInfo[]
  pending: SdkSafeTxInfo[]
  unconfirmed?: SdkSafeTxInfo[]
}

export type SafeStxHashParams = {
  token: string
  safe: string
  inputNullifiers: bigint[]
  spendingLimit: bigint
  amounts: bigint[]
  recipient: string
  outputPubkeys: bigint[]
  outputAmounts: bigint[]
}
