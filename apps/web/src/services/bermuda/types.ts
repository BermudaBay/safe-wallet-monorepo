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
}

export type SdkListTxsResult = {
  all: SdkSafeTxInfo[]
  pending: SdkSafeTxInfo[]
  unconfirmed?: SdkSafeTxInfo[]
}
