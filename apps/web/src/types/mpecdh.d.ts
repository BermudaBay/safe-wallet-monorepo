declare module 'mpecdh' {
    import type { BrowserProvider, JsonRpcProvider, Provider, Signer } from 'ethers'
  
    type EthersProvider = Provider | JsonRpcProvider | BrowserProvider
  
    export function calcMPECDHAddress(safeAddress: string, owners: string[], create2Caller?: string): string
    export function isMPECDHDeployed(
      safeAddress: string,
      provider: EthersProvider,
      create2Caller?: string,
    ): Promise<string | null>
    export function isMPECDHReady(safeAddress: string, provider: EthersProvider, create2Caller?: string): Promise<boolean>
    export function buildMPECDHDeployment(
      safeAddress: string,
      owners: string[],
      create2Caller?: string,
    ): { to: string; data: string; value: number; operation: 0 | 1 }
    export function getOwners(safeAddress: string, provider: EthersProvider): Promise<string[]>
    export function proposeMPECDHDeployment(
      safeAddress: string,
      owners: string[],
      provider: EthersProvider,
      create2Caller?: string,
    ): Promise<any>
  
    export type CeremonyHelper = {
      blocking(): Promise<string[]>
      status(signer: Signer): Promise<number>
      step0(signer: Signer): Promise<any>
      stepN(signer: Signer): Promise<any>
      stepX(signer: Signer): Promise<string>
    }
  
    export default function mpecdh(address: string, provider: EthersProvider): Promise<CeremonyHelper>
  }