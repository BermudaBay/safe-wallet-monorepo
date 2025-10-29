import { JsonRpcProvider, Contract } from 'ethers'
import { SafeInfo, ImplementationVersionState } from '@safe-global/safe-gateway-typescript-sdk'

export default async function loadSafeInfo(chainId: number, address: string): Promise<SafeInfo> {
  const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_JSON_RPC_URL!)
  const contract = new Contract(
    address,
    [
      'function getOwners() external view returns (address[])',
      'function getThreshold() external view returns (uint256)',
      'function nonce() external view returns (uint256)',
    ],
    provider,
  )

  const [owners, threshold, nonce] = await Promise.all([
    contract.getOwners(),
    contract.getThreshold(),
    contract.nonce(),
  ])

  const result: SafeInfo = {
    address: {
      value: address,
    },
    chainId: String(chainId),
    nonce,
    threshold,
    owners: owners.map((address: string) => ({
      value: address,
    })),
    implementation: {
      value: process.env.NEXT_PUBLIC_MASTERCOPY!,
    },
    implementationVersionState: ImplementationVersionState.UP_TO_DATE,
    collectiblesTag: null,
    txQueuedTag: null,
    txHistoryTag: null,
    messagesTag: null,
    modules: null,
    // TODO: Read fallback handler address from chain.
    fallbackHandler: null,
    guard: null,
    version: '1.5.0',
  }

  return result
}
