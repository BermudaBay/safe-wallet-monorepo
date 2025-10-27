import { useEffect } from 'react'

import { WALLET_EVENTS } from '@/services/analytics'
import { SafeMsgEvent, safeMsgSubscribe } from '@/services/safe-messages/safeMsgEvents'

const safeMsgEvents = {
  [SafeMsgEvent.PROPOSE]: WALLET_EVENTS.SIGN_MESSAGE,
  [SafeMsgEvent.CONFIRM_PROPOSE]: WALLET_EVENTS.CONFIRM_MESSAGE,
}

export const useSafeMsgTracking = (): void => {
  useEffect(() => {
    const unsubFns = Object.entries(safeMsgEvents).map(([safeMsgEvent]) =>
      safeMsgSubscribe(safeMsgEvent as SafeMsgEvent, () => {}),
    )

    return () => {
      unsubFns.forEach((unsub) => unsub())
    }
  }, [])
}
