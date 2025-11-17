import { useEffect, useState } from 'react'

export function shortenAddress(address: string, partLength = 4) {
  return shortenHex(address, partLength)
}

export function shortenHex(hex: string, partLength = 8) {
  const front = hex.substring(0, partLength + 2)
  const back = hex.substring(hex.length - partLength)
  return front + '...' + back
}

export async function deriveSeedFromPassword(password: string, iterations = 100_000, keyLength = 32) {
  const passwordEncoder = new TextEncoder()
  const passwordBytes = passwordEncoder.encode(password)

  // TODO: Use randomness rather than reversed password to generate salt.
  const saltEncoder = new TextEncoder()
  const saltBytes = saltEncoder.encode(password)
  const salt = saltBytes.reverse()

  const keyMaterial = await crypto.subtle.importKey('raw', passwordBytes, { name: 'PBKDF2' }, false, ['deriveBits'])

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    keyLength * 8,
  )

  const result = new Uint8Array(derivedBits)

  return result
}

export function useAsyncMemo<T>(func: () => Promise<T>, dependencies: React.DependencyList) {
  const [result, setResult] = useState<T | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    func().then((value: any) => {
      if (!cancelled) {
        setResult(value)
      }
    })

    return () => {
      cancelled = true
    }
  }, dependencies)

  return result
}
