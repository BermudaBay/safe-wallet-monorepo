import { useEffect } from 'react'
import { useRouter } from 'next/router'
import useSafeInfo from '@/hooks/useSafeInfo'
import { initBermudaSDK, setBermudaSDK } from './useBermudaSDK'
import { trackError } from '@/services/exceptions'
import ErrorCodes from '@safe-global/utils/services/exceptions/ErrorCodes'
import { useAppDispatch } from '@/store'
import { showNotification } from '@/store/notificationsSlice'
import { useWeb3ReadOnly } from '@/hooks/wallets/web3'
import { parsePrefixedAddress, sameAddress } from '@safe-global/utils/utils/addresses'
import { asError } from '@safe-global/utils/services/exceptions/utils'

export const useInitBermudaSDK = () => {
  const { safe, safeLoaded } = useSafeInfo()
  const dispatch = useAppDispatch()
  const web3ReadOnly = useWeb3ReadOnly()

  const { query } = useRouter()
  const prefixedAddress = Array.isArray(query.safe) ? query.safe[0] : query.safe
  const { address } = parsePrefixedAddress(prefixedAddress || '')

  useEffect(() => {
    if (!safeLoaded || !web3ReadOnly || !sameAddress(address, safe.address.value)) {
      // If we don't reset the SDK, a previous Safe could remain in the store
      setBermudaSDK(undefined)
      return
    }

    web3ReadOnly?.getNetwork().then(({ chainId }) => {

      initBermudaSDK({ chainId: safe.chainId || chainId })
        .then(setBermudaSDK)
        .catch((_e) => {
          const e = asError(_e)
          dispatch(
            showNotification({
              message: 'Error initializing the Bermuda SDK. Please try reloading the page.',
              groupKey: 'core-sdk-init-error',
              variant: 'error',
              detailedMessage: e.message,
            }),
          )
          trackError(ErrorCodes._105, e.message)
        })

    })
  }, [
    address,
    dispatch,
    safe.chainId,
    safeLoaded,
    web3ReadOnly,
  ])
}
