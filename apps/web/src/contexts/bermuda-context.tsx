import useSafeInfo from '@/hooks/useSafeInfo'
import { useBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import { useState, useContext, createContext, type ReactNode, useEffect, Dispatch, SetStateAction } from 'react'

const KEYPAIRS_NAMESPACE = 'keypairs'
const EXECUTIONS_NAMESPACE = 'executions'
const MISCELLANEOUS_NAMESPACE = 'misc'

const STX_TYPE_KEY = 'stx-type'

export enum STXType {
  Deposit,
  Transfer,
  Withdrawal
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
  const [stxType, setStxType] = useState<STXType | undefined>()

  useEffect(() => {
    if (sdk) {
      const key = STX_TYPE_KEY
      const namespace = MISCELLANEOUS_NAMESPACE

      const result = sdk.storage.get({ namespace, key })

      setStxType(result)
    }
  }, [sdk])

  useEffect(() => {
    if (sdk && safeAddress) {
      const key = safeAddress.toLowerCase()
      const namespace = KEYPAIRS_NAMESPACE

      const deserializer = function (text: string) {
        const parsed = JSON.parse(text)
        return sdk.types.KeyPair.fromJSON(parsed)
      }

      const result = sdk.storage.get({ namespace, key, deserializer })

      setKeyPair(result)
    }
  }, [sdk, safeAddress])

  function saveStxType(type: STXType) {
    const key = STX_TYPE_KEY
    const namespace = MISCELLANEOUS_NAMESPACE
    const value = type

    sdk.storage.set({ namespace, key, value })

    setStxType(value)
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
    <BermudaContext.Provider value={{ sdk, keyPair, safeAddress, saveKeyPair, deleteKeyPair, saveStxType, stxType, saveStxExecuted, isStxExecuted }}>
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
  deleteKeyPair: () => void
  stxType: STXType | undefined
  saveStxType: (value: STXType) => void
  saveStxExecuted: (id: string) => void
  isStxExecuted(id: string): boolean
}

type Props = {
  children: ReactNode | ReactNode[]
}
