import { AppRoutes } from '@/config/routes'
import { useRouter } from 'next/router'
import { useEffect, useMemo } from 'react'
import type { ConnectedWallet } from '@/hooks/wallets/useOnboard'
import { type SafeItem } from './useAllSafes'
import type { AllSafeItemsGrouped } from './useAllSafesGrouped'
import { type MultiChainSafeItem } from './useAllSafesGrouped'

let isOwnedSafesTracked = false
let isPinnedSafesTracked = false

const useTrackSafesCount = (safes: AllSafeItemsGrouped, wallet: ConnectedWallet | null) => {
  const router = useRouter()
  const isLoginPage = router.pathname === AppRoutes.welcome.accounts

  const ownedMultiChainSafes = useMemo(
    () => safes.allMultiChainSafes?.filter((account) => account.safes.some(({ isReadOnly }) => !isReadOnly)),
    [safes],
  )

  const ownedSafes = useMemo<(MultiChainSafeItem | SafeItem)[]>(
    () => [...(ownedMultiChainSafes ?? []), ...(safes.allSingleSafes?.filter(({ isReadOnly }) => !isReadOnly) ?? [])],
    [safes, ownedMultiChainSafes],
  )

  // TODO: This is computed here and inside PinnedSafes now. Find a way to optimize it
  const pinnedSafes = useMemo<(MultiChainSafeItem | SafeItem)[]>(
    () => [
      ...(safes.allSingleSafes?.filter(({ isPinned }) => isPinned) ?? []),
      ...(safes.allMultiChainSafes?.filter(({ isPinned }) => isPinned) ?? []),
    ],
    [safes],
  )

  // Reset tracking for new wallet
  useEffect(() => {
    isOwnedSafesTracked = false
  }, [wallet?.address])

  useEffect(() => {
    if (wallet && !isOwnedSafesTracked && ownedSafes && ownedSafes.length > 0 && isLoginPage) {
      isOwnedSafesTracked = true
    }
  }, [isLoginPage, ownedSafes, wallet])

  useEffect(() => {
    if (!isPinnedSafesTracked && pinnedSafes && pinnedSafes.length > 0 && isLoginPage) {
      isPinnedSafesTracked = true
    }
  }, [isLoginPage, pinnedSafes])
}

export default useTrackSafesCount
