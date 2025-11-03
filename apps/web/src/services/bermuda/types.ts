export type SdkSafeTx = {
  to: string
  data: string
  value: bigint
  operation: number
  safeTxGas: bigint
  baseGas: bigint
  gasPrice: bigint
  gasToken: string
  refundReceiver: string
  nonce: bigint
}

export type SdkSafeTxInfo = {
  hash: string
  details: SdkSafeTx
  signatures: Record<string, string>
  executed: boolean
}

export type SdkListTxsResult = {
  all: SdkSafeTxInfo[]
  pending: SdkSafeTxInfo[]
  unconfirmed?: SdkSafeTxInfo[]
}
