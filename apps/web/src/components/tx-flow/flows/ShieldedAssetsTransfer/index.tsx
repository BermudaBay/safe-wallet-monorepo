import { useMemo } from 'react'
import AssetsIcon from '@/public/images/sidebar/assets.svg'
import { TxFlow } from '@/components/tx-flow/TxFlow'
import { TxFlowStep } from '@/components/tx-flow/TxFlowStep'
import CreateTokenTransfer, { type CreateTokenTransferProps } from '../TokenTransfer/CreateTokenTransfer'
import { TokenTransferFields } from '../TokenTransfer'
import { ZERO_ADDRESS } from '@safe-global/protocol-kit/dist/src/utils/constants'
import { TokenTransferType } from '../TokenTransfer'
import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import ReviewShieldedAssetsTranfer from './ReviewShieldedAssetsTransfer'
import { useBermuda } from '@/contexts/bermuda-context'

export type ShieldedAssetsTransferFlowProps = CreateTokenTransferProps

const ShieldedAssetsTransferFlow = ({ txNonce }: ShieldedAssetsTransferFlowProps = {}) => {
  const bermuda = useBermuda()

  const initialData = useMemo(
    () => ({
      recipients: [
        {
          [TokenTransferFields.recipient]: bermuda.keyPair.address(),
          [TokenTransferFields.tokenAddress]: ZERO_ADDRESS,
          [TokenTransferFields.amount]: '',
        },
      ],
      type: TokenTransferType.multiSig,
    }),
    [bermuda],
  )

  return (
    <TxFlow
      initialData={initialData}
      icon={AssetsIcon}
      subtitle="Transfer shielded tokens"
      ReviewTransactionComponent={ReviewShieldedAssetsTranfer}
    >
      <TxFlowStep title="New transaction">
        <CreateTokenTransfer txNonce={txNonce} />
      </TxFlowStep>
    </TxFlow>
  )
}

export default ShieldedAssetsTransferFlow
