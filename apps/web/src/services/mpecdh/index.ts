import { type BrowserProvider, type JsonRpcProvider, type Provider, type Signer } from 'ethers'
import * as mpecdhModule from 'mpecdh'

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

if (!calcMPECDHAddress || !mpecdh) {
  throw new Error('Failed to load mpecdh module. Ensure git@github.com:BermudaBay/mpecdh.git is installed.')
}

export { calcMPECDHAddress, isMPECDHDeployed, isMPECDHReady, buildMPECDHDeployment, getOwners, proposeMPECDHDeployment }

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

// normalize signer to carry address property for the CJS helper
async function ensureAddress<S extends Signer>(signer: S): Promise<S & { address: string }> {
  const addr = (signer as any).address ?? (await signer.getAddress?.())
  if (!addr) {
    return signer as S & { address: string }
  }
  ;(signer as any).address = addr
  return signer as S & { address: string }
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
