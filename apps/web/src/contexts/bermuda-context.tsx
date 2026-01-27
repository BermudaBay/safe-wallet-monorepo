import useSafeInfo from '@/hooks/useSafeInfo'
import { resolveStxPreimage } from '@/services/bermuda/utils'
import { useBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import { type SafeStxHashParams } from '@/services/bermuda/types'
import { useState, useContext, createContext, type ReactNode, useEffect, useCallback } from 'react'

const KEYPAIRS_NAMESPACE = 'keypairs'
const EXECUTIONS_NAMESPACE = 'executions'
const MISCELLANEOUS_NAMESPACE = 'misc'

const STX_INFO_KEY = 'stx-info'

export enum STXType {
  Deposit,
  Transfer,
  Withdrawal,
  Undefined,
}

export type STXInfo = {
  type: STXType
  data: SafeStxHashParams
}

export function useBermuda() {
  const context = useContext(BermudaContext)

  if (!context) {
    throw new Error('useBermuda must be used within a BermudaProvider')
  }

  return context
}

export function BermudaProvider(props: Props) {
  const sdk = useBermudaSDK()
  const { safeAddress } = useSafeInfo()
  const [keyPair, setKeyPair] = useState<any | undefined>()
  const [stxInfo, setStxInfo] = useState<STXInfo | undefined>()

  const loadKeyPair = useCallback(() => {
    const key = safeAddress.toLowerCase()
    const namespace = KEYPAIRS_NAMESPACE

    const deserializer = function (text: string) {
      const parsed = JSON.parse(text)
      return sdk.types.KeyPair.fromJSON(parsed)
    }

    return sdk.storage.get({ namespace, key, deserializer })
  }, [safeAddress, sdk])

  const loadStxInfo = useCallback(() => {
    const key = STX_INFO_KEY
    const namespace = MISCELLANEOUS_NAMESPACE

    const deserializer = function (text: string) {
      const { type, data } = JSON.parse(text)

      const amounts = data.amounts.map((item: string) => BigInt(item))
      const inputNullifiers = data.inputNullifiers.map((item: string) => BigInt(item))
      const outputAmounts = data.outputAmounts.map((item: string) => BigInt(item))
      const outputPubkeys = data.outputPubkeys.map((item: string) => BigInt(item))
      const spendingLimit = BigInt(data.spendingLimit)

      const result: STXInfo = {
        type,
        data: {
          ...data,
          amounts,
          inputNullifiers,
          outputAmounts,
          outputPubkeys,
          spendingLimit,
        },
      }

      return result
    }

    const result: STXInfo | undefined = sdk.storage.get({ namespace, key, deserializer })

    return result
  }, [sdk])

  useEffect(() => {
    if (sdk && safeAddress) {
      const keyPairResult = loadKeyPair()
      const stxInfoResult = loadStxInfo()

      setKeyPair(keyPairResult)
      setStxInfo(stxInfoResult)
    }
  }, [sdk, safeAddress, loadKeyPair, loadStxInfo])

  async function getStxPreimage(txHash: string) {
    if (keyPair) {
      return resolveStxPreimage(keyPair, txHash)
    }
    return undefined
  }

  function saveStxInfo(value: STXInfo | undefined) {
    const key = STX_INFO_KEY
    const namespace = MISCELLANEOUS_NAMESPACE

    const serializer = function (value: STXInfo) {
      const { type, data } = value

      const amounts = data.amounts.map((item) => String(item))
      const inputNullifiers = data.inputNullifiers.map((item) => String(item))
      const outputAmounts = data.outputAmounts.map((item) => String(item))
      const outputPubkeys = data.outputPubkeys.map((item) => String(item))
      const spendingLimit = String(data.spendingLimit)

      return JSON.stringify({
        type,
        data: {
          ...data,
          amounts,
          inputNullifiers,
          outputAmounts,
          outputPubkeys,
          spendingLimit,
        },
      })
    }

    sdk.storage.set({ namespace, key, value, serializer })

    // Load STX Info to ensure that the date is correctly typed.
    const result = loadStxInfo()

    setStxInfo(result)
  }

  function saveKeyPair(keyPair: any) {
    const key = safeAddress.toLowerCase()
    const namespace = KEYPAIRS_NAMESPACE
    const value = keyPair

    sdk.storage.set({ namespace, key, value })

    setKeyPair(keyPair)
  }

  function deleteKeyPair() {
    const key = safeAddress.toLowerCase()
    const namespace = KEYPAIRS_NAMESPACE

    sdk.storage.del({ namespace, key })

    setKeyPair(undefined)
  }

  function saveStxExecuted(id: string) {
    const key = id.toLowerCase()
    const namespace = EXECUTIONS_NAMESPACE
    const value = true

    sdk.storage.set({ namespace, key, value })

    setKeyPair(keyPair)
  }

  function isStxExecuted(id: string): boolean {
    const key = id.toLowerCase()
    const namespace = EXECUTIONS_NAMESPACE

    const result = sdk.storage.get({ namespace, key })

    return result
  }

  return (
    <BermudaContext.Provider
      value={{
        sdk,
        keyPair,
        safeAddress,
        saveKeyPair,
        loadKeyPair,
        deleteKeyPair,
        stxInfo,
        saveStxInfo,
        loadStxInfo,
        saveStxExecuted,
        isStxExecuted,
        getStxPreimage,
      }}
    >
      {props.children}
    </BermudaContext.Provider>
  )
}

const BermudaContext = createContext<BermudaContext | undefined>(undefined)

type BermudaContext = {
  sdk: any
  keyPair: any | undefined
  safeAddress: string
  saveKeyPair: (keyPair: any) => void
  loadKeyPair: () => any | undefined
  deleteKeyPair: () => void
  stxInfo: STXInfo | undefined
  saveStxInfo: (value: STXInfo | undefined) => void
  loadStxInfo: () => STXInfo | undefined
  saveStxExecuted: (id: string) => void
  isStxExecuted(id: string): boolean
  getStxPreimage(txHash: string): Promise<SafeStxHashParams | undefined>
}

type Props = {
  children: ReactNode | ReactNode[]
}
