import type { AllSafeItems } from '@/features/myAccounts/hooks/useAllSafesGrouped'
import type { Member } from '@safe-global/store/gateway/AUTO_GENERATED/spaces'
import { useEffect } from 'react'

let isTotalSafesTracked = false
let isTotalMembersTracked = false

const useTrackSpace = (safes: AllSafeItems, activeMembers: Member[]) => {
  useEffect(() => {
    if (isTotalSafesTracked) return

    isTotalSafesTracked = true
  }, [safes.length])

  useEffect(() => {
    if (isTotalMembersTracked) return

    isTotalMembersTracked = true
  }, [activeMembers.length])
}

export default useTrackSpace
