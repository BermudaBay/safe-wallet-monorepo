import WalletLogin from '@/components/welcome/WelcomeLogin/WalletLogin'
import { useSiwe } from '@/services/siwe/useSiwe'
import { useAppDispatch } from '@/store'
import { setAuthenticated } from '@/store/authSlice'
import { showNotification } from '@/store/notificationsSlice'
import { logError } from '@/services/exceptions'
import ErrorCodes from '@safe-global/utils/services/exceptions/ErrorCodes'

const SignInButton = () => {
  const dispatch = useAppDispatch()
  const { signIn } = useSiwe()

  const handleSignIn = async () => {
    try {
      const result = await signIn()

      if (result && result.error) {
        throw result.error
      }

      if (result) {
        const oneDayInMs = 24 * 60 * 60 * 1000
        dispatch(setAuthenticated(Date.now() + oneDayInMs))
      }
    } catch (error) {
      logError(ErrorCodes._640)

      dispatch(
        showNotification({
          message: `Something went wrong while trying to sign in`,
          variant: 'error',
          groupKey: 'sign-in-failed',
        }),
      )
    }
  }

  return <WalletLogin onLogin={() => {}} onContinue={handleSignIn} buttonText="Sign in with" />
}

export default SignInButton
