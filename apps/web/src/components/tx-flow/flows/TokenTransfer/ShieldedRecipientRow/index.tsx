import AddressBookInput from '@/components/common/AddressBookInput'
import ShieldedTokenAmountInput from '@/components/common/ShieldedTokenAmountInput'
import { useShieldedBalances } from '@/hooks/useShieldedBalances'
import DeleteIcon from '@/public/images/common/delete.svg'
import { Box, Button, FormControl, Stack, SvgIcon } from '@mui/material'
import { get, useFormContext } from 'react-hook-form'
import type { FieldArrayPath, FieldPath } from 'react-hook-form'
import type { MultiTokenTransferParams, TokenTransferParams } from '..'
import { MultiTokenTransferFields, TokenTransferFields, TokenTransferType } from '..'
import { useTokenAmount } from '../utils'
import { useHasPermission } from '@/permissions/hooks/useHasPermission'
import { Permission } from '@/permissions/config'
import { useCallback, useContext, useEffect, useMemo } from 'react'
import { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import SpendingLimitRow from '../SpendingLimitRow'
import { useSelector } from 'react-redux'
import { selectSpendingLimits } from '@/store/spendingLimitsSlice'
import { sameAddress } from '@safe-global/utils/utils/addresses'
import Track from '@/components/common/Track'
import { MODALS_EVENTS } from '@/services/analytics'
import { ZeroAddress } from 'ethers'
import { STXType, useBermuda } from '@/contexts/bermuda-context'

const getFieldName = (
  field: keyof TokenTransferParams,
  { name, index }: RecipientRowProps['fieldArray'],
): FieldPath<MultiTokenTransferParams> => `${name}.${index}.${field}`

type RecipientRowProps = {
  disableSpendingLimit: boolean
  fieldArray: { name: FieldArrayPath<MultiTokenTransferParams>; index: number }
  removable?: boolean
  remove?: (index: number) => void
}

export const ShieldedRecipientRow = ({ fieldArray, removable = true, remove, disableSpendingLimit }: RecipientRowProps) => {
  const { balances } = useShieldedBalances()
  const spendingLimits = useSelector(selectSpendingLimits)
  const { stxType } = useBermuda()

  const {
    formState: { errors },
    trigger,
    watch,
  } = useFormContext<MultiTokenTransferParams>()

  const { setNonceNeeded } = useContext(SafeTxContext)

  const recipientFieldName = getFieldName(TokenTransferFields.recipient, fieldArray)

  const type = watch(MultiTokenTransferFields.type)
  const recipient = watch(recipientFieldName)
  let tokenAddress: string = watch(getFieldName(TokenTransferFields.tokenAddress, fieldArray))
  console.log("$$$$$ tokenAddress", tokenAddress)

  if (tokenAddress === ZeroAddress) {
    tokenAddress = balances.items.find(t => t.tokenInfo.symbol === 'WETH')?.tokenInfo.address!
  }

  const selectedToken = balances.items.find((item) => sameAddress(item.tokenInfo.address, tokenAddress))
  console.log("$$$$$ selectedToken", selectedToken)
  const { totalAmount, spendingLimitAmount } = useTokenAmount(selectedToken)

  const isAddressValid = !!recipient && !get(errors, recipientFieldName)

  const canCreateSpendingLimitTxWithToken = useHasPermission(Permission.CreateSpendingLimitTransaction, {
    tokenAddress,
  })

  const isSpendingLimitType = type === TokenTransferType.spendingLimit

  //  const isShieldedDeposit = keyPair && keyPair.address().toLowerCase() === (recipient as string).toLowerCase()

  const spendingLimitBalances = useMemo(
    () =>
      balances.items.filter(({ tokenInfo }) =>
        spendingLimits.find((sl) => sameAddress(sl.token.address, tokenInfo.address)),
      ),
    [balances.items, spendingLimits],
  )

  const maxAmount = isSpendingLimitType && totalAmount > spendingLimitAmount ? spendingLimitAmount : totalAmount

  const onRemove = useCallback(() => {
    remove?.(fieldArray.index)
    trigger(MultiTokenTransferFields.recipients)
  }, [remove, fieldArray.index, trigger])

  useEffect(() => {
    setNonceNeeded(!isSpendingLimitType || spendingLimitAmount === 0n)
  }, [setNonceNeeded, isSpendingLimitType, spendingLimitAmount])

  return (
    <>
      <Stack spacing={1}>
        <Stack spacing={2}>

          {
            stxType !== STXType.Withdrawal && (
              <FormControl fullWidth>
                <AddressBookInput name={recipientFieldName} canAdd={isAddressValid} />
              </FormControl>
            )
          }

          <FormControl fullWidth>
            <ShieldedTokenAmountInput
              fieldArray={fieldArray}
              balances={isSpendingLimitType ? spendingLimitBalances : balances.items}
              selectedToken={selectedToken}
              maxAmount={maxAmount}
              deps={[MultiTokenTransferFields.recipients]}
            />
          </FormControl>

          {!disableSpendingLimit && canCreateSpendingLimitTxWithToken && (
            <FormControl fullWidth>
              <SpendingLimitRow availableAmount={spendingLimitAmount} selectedToken={selectedToken?.tokenInfo} />
            </FormControl>
          )}
        </Stack>

        {removable && (
          <Box>
            <Track {...MODALS_EVENTS.REMOVE_RECIPIENT}>
              <Button
                data-testid="remove-recipient-btn"
                onClick={onRemove}
                aria-label="Remove recipient"
                variant="text"
                startIcon={<SvgIcon component={DeleteIcon} inheritViewBox fontSize="small" />}
                size="compact"
              >
                Remove recipient
              </Button>
            </Track>
          </Box>
        )}
      </Stack>
    </>
  )
}

export default ShieldedRecipientRow
