import { keys as keysFromIndexedDb, update as updateIndexedDb } from 'idb-keyval'
import { useEffect } from 'react'

import {
  DEFAULT_WEBHOOK_TRACKING,
  createNotificationTrackingIndexedDb,
  parseNotificationTrackingKey,
} from '@/services/push-notifications/tracking'
import ErrorCodes from '@safe-global/utils/services/exceptions/ErrorCodes'
import { logError } from '@/services/exceptions'
import type { NotificationTracking, NotificationTrackingKey } from '@/services/push-notifications/tracking'
import { useHasFeature } from '@/hooks/useChains'

import { FEATURES } from '@safe-global/utils/utils/chains'

const handleTrackCachedNotificationEvents = async (
  trackingStore: ReturnType<typeof createNotificationTrackingIndexedDb>,
) => {
  try {
    // Get all tracked webhook events by chainId, e.g. "1:NEW_CONFIRMATION"
    const trackedNotificationKeys = await keysFromIndexedDb<NotificationTrackingKey>(trackingStore)

    // Get the number of notifications shown/opened and track then clear the cache
    const promises = trackedNotificationKeys.map((key) => {
      return updateIndexedDb<NotificationTracking[NotificationTrackingKey]>(
        key,
        (notificationCount) => {
          if (notificationCount) {
            parseNotificationTrackingKey(key)
          }

          // Return the default cache with 0 shown/opened events
          return DEFAULT_WEBHOOK_TRACKING
        },
        trackingStore,
      )
    })

    await Promise.all(promises)
  } catch (e) {
    logError(ErrorCodes._401, e)
  }
}

export const useNotificationTracking = (): void => {
  const isNotificationFeatureEnabled = useHasFeature(FEATURES.PUSH_NOTIFICATIONS)

  useEffect(() => {
    if (typeof indexedDB !== 'undefined' && isNotificationFeatureEnabled) {
      handleTrackCachedNotificationEvents(createNotificationTrackingIndexedDb())
    }
  }, [isNotificationFeatureEnabled])
}
