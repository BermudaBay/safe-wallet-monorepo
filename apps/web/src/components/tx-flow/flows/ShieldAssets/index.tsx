import { useMemo } from 'react'
import AssetsIcon from '@/public/images/sidebar/assets.svg'
import { TxFlow } from '@/components/tx-flow/TxFlow'
import { TxFlowStep } from '@/components/tx-flow/TxFlowStep'
import CreateTokenTransfer, { type CreateTokenTransferProps } from '../TokenTransfer/CreateTokenTransfer'
import ReviewTokenTx from '../TokenTransfer/ReviewTokenTransfer'
import { TokenTransferFields } from '../TokenTransfer'
import { ZERO_ADDRESS } from '@safe-global/protocol-kit/dist/src/utils/constants'
import { TokenTransferType } from '../TokenTransfer'
import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'

export type ShieldAssetsFlowProps = CreateTokenTransferProps

const KEYPAIR_SEED = BigInt(123445) 

const ShieldAssetsFlow = ({ txNonce }: ShieldAssetsFlowProps = {}) => {
  const shieldedAddress = useMemo(() => {
    const bermudaSDK = getBermudaSDK()
    if (!bermudaSDK) {
      console.error('[ShieldAssetsFlow] Bermuda SDK not initialized')
      return ''
    }

    try {
      const shieldedKeyPair = new bermudaSDK.types.KeyPair(KEYPAIR_SEED)
      return shieldedKeyPair.address()
    } catch (error) {
      console.error('[ShieldAssetsFlow] Error creating shielded keypair:', error)
      return ''
    }
  }, [])

  const initialData = useMemo(
    () => ({
      recipients: [
        {
          [TokenTransferFields.recipient]: shieldedAddress,
          [TokenTransferFields.tokenAddress]: ZERO_ADDRESS,
          [TokenTransferFields.amount]: '',
        },
      ],
      type: TokenTransferType.multiSig,
    }),
    [shieldedAddress],
  )

  return (
    <TxFlow
      initialData={initialData}
      icon={AssetsIcon}
      subtitle="Shield tokens"
      ReviewTransactionComponent={ReviewTokenTx}
    >
      <TxFlowStep title="New transaction">
        <CreateTokenTransfer txNonce={txNonce} />
      </TxFlowStep>
    </TxFlow>
  )
}

export default ShieldAssetsFlow