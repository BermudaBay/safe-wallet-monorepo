import { useMemo, useState } from 'react'
import AssetsIcon from '@/public/images/sidebar/assets.svg'
import { TxFlow } from '@/components/tx-flow/TxFlow'
import { TxFlowStep } from '@/components/tx-flow/TxFlowStep'
import CreateTokenTransfer, { type CreateTokenTransferProps } from '../TokenTransfer/CreateTokenTransfer'
import { TokenTransferFields } from '../TokenTransfer'
import { ZERO_ADDRESS } from '@safe-global/protocol-kit/dist/src/utils/constants'
import { TokenTransferType } from '../TokenTransfer'
import { getBermudaSDK } from '@/hooks/bermudaSDK/useBermudaSDK'
import ReviewShieldAssets from './ReviewUnshieldAssets'
import useSafeInfo from '@/hooks/useSafeInfo'
import { Checkbox, FormControlLabel } from '@mui/material'

export type UnshieldAssetsFlowProps = CreateTokenTransferProps

const UnshieldAssetsFlow = ({ txNonce }: UnshieldAssetsFlowProps = {}) => {
  const { safeAddress } = useSafeInfo()

  const [unwrap, setUnwrap] = useState(true)

  const initialData = useMemo(
    () => ({
      recipients: [
        {
          [TokenTransferFields.recipient]: safeAddress,
          [TokenTransferFields.tokenAddress]: ZERO_ADDRESS,
          [TokenTransferFields.amount]: '',
        },
      ],
      type: TokenTransferType.multiSig,
    }),
    [safeAddress],
  )

  return (
    <TxFlow
      initialData={initialData}
      icon={AssetsIcon}
      subtitle="Unshield tokens"
      ReviewTransactionComponent={ReviewShieldAssets}
    >
      <TxFlowStep title="New transaction">
        <CreateTokenTransfer txNonce={txNonce} />

        {/* TODO only show this for WETH */}
        <FormControlLabel
          sx={({ palette }) => ({
            flex: 1,
            '.MuiIconButton-root:not(.Mui-checked)': {
              color: palette.text.disabled,
            },
          })}
          control={<Checkbox checked={unwrap} onChange={e => setUnwrap(e.target.checked)} name="unwrap" />}
          label="Unwrap"
          title="Unwrap WETH to ETH"
        />

      </TxFlowStep>
    </TxFlow>
  )
}

export default UnshieldAssetsFlow
