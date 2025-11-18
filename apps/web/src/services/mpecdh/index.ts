import { type BrowserProvider, type JsonRpcProvider, type Provider, type Signer } from 'ethers'
import * as mpecdhModule from 'mpecdh'

const CREATE_CALL_LIB = process.env.NEXT_PUBLIC_CREATE_CALL_LIB

type EthersProvider = JsonRpcProvider | BrowserProvider | Provider

const {
  calcMPECDHAddress,
  isMPECDHDeployed,
  isMPECDHReady,
  buildMPECDHDeployment,
  mpecdh,
  getOwners,
  proposeMPECDHDeployment,
} = (mpecdhModule as any) || {}

export function calcAddress(safeAddress: string, owners: string[]) {
  return calcMPECDHAddress(safeAddress, owners, CREATE_CALL_LIB)
}

export function isDeployed(safeAddress: string, provider: EthersProvider) {
  return isMPECDHDeployed(safeAddress, provider, CREATE_CALL_LIB)
}

export function isReady(safeAddress: string, provider: EthersProvider) {
  return isMPECDHReady(safeAddress, provider, CREATE_CALL_LIB)
}

export function buildDeployment(safeAddress: string, owners: string[]) {
  return buildMPECDHDeployment(safeAddress, owners, CREATE_CALL_LIB)
}

export { getOwners, proposeMPECDHDeployment, CREATE_CALL_LIB }

export type SafeCall = {
  to: string
  data: string
  value: string | number
  operation: 0 | 1
}

export async function getBlocking(address: string, provider: EthersProvider): Promise<string[]> {
  const helper = await mpecdh(address, provider)
  return helper.blocking()
}

async function ensureAddress<S extends Signer>(signer: S): Promise<S & { address: string }> {
  const addr = (signer as any).address ?? (await signer.getAddress?.())
  if (!addr) {
    return signer as S & { address: string }
  }
  const wrapped = Object.create(signer) as S & { address: string }
  Object.defineProperty(wrapped, 'address', {
    value: addr,
    writable: false,
    configurable: true,
    enumerable: true,
  })
  return wrapped
}

export type CeremonyHelper = {
  blocking(): Promise<string[]>
  status(signer: Signer): Promise<number>
  step0(signer: Signer): Promise<void>
  stepN(signer: Signer): Promise<void>
  stepX(signer: Signer): Promise<string>
}

export async function createCeremonyHelper(address: string, provider: EthersProvider): Promise<CeremonyHelper> {
  const helper = await mpecdh(address, provider)
  return {
    blocking() {
      return helper.blocking()
    },
    async status(signer: Signer) {
      const s = await ensureAddress(signer)
      return helper.status(s)
    },
    async step0(signer: Signer) {
      const s = await ensureAddress(signer)
      return helper.step0(s)
    },
    async stepN(signer: Signer) {
      const s = await ensureAddress(signer)
      return helper.stepN(s)
    },
    async stepX(signer: Signer) {
      const s = await ensureAddress(signer)
      return helper.stepX(s)
    },
  }
}
