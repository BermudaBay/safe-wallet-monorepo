import { useCallback, useContext, useEffect } from 'react'
import type { ReactElement, PropsWithChildren } from 'react'

import { createRemoveOwnerTx } from '@/services/tx/tx-sender'
import { SafeTxContext } from '../../SafeTxProvider'
import type { RemoveOwnerFlowProps } from '.'
import ReviewTransaction from '@/components/tx/ReviewTransactionV2'

export const ReviewRemoveOwner = ({
  params,
  onSubmit,
  children,
}: PropsWithChildren<{
  params: RemoveOwnerFlowProps
  onSubmit: () => void
}>): ReactElement => {
  const { setSafeTx, setSafeTxError } = useContext(SafeTxContext)
  const { removedOwner, threshold } = params

  useEffect(() => {
    createRemoveOwnerTx({ ownerAddress: removedOwner.address, threshold }).then(setSafeTx).catch(setSafeTxError)
  }, [removedOwner.address, setSafeTx, setSafeTxError, threshold])

  const onFormSubmit = useCallback(() => {
    onSubmit()
  }, [onSubmit])

  return <ReviewTransaction onSubmit={onFormSubmit}>{children}</ReviewTransaction>
}
