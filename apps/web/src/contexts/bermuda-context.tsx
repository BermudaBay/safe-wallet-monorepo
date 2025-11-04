import useSafeInfo from '@/hooks/useSafeInfo'
import { useBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import { useState, useContext, createContext, type ReactNode, useEffect } from 'react'

const KEYPAIRS_NAMESPACE = 'keypairs'

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

  return (
    <BermudaContext.Provider value={{ sdk, keyPair, safeAddress, saveKeyPair, deleteKeyPair }}>
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
}

type Props = {
  children: ReactNode | ReactNode[]
}
