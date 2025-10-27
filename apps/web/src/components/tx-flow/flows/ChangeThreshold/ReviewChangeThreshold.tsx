import { useContext, useEffect, type PropsWithChildren } from 'react'

import { createUpdateThresholdTx } from '@/services/tx/tx-sender'
import { SafeTxContext } from '@/components/tx-flow/SafeTxProvider'
import { ChangeThresholdFlowFieldNames } from '@/components/tx-flow/flows/ChangeThreshold'
import type { ChangeThresholdFlowProps } from '@/components/tx-flow/flows/ChangeThreshold'

import ReviewTransaction from '@/components/tx/ReviewTransactionV2'

const ReviewChangeThreshold = ({
  params,
  onSubmit,
  children,
}: PropsWithChildren<{ params: ChangeThresholdFlowProps; onSubmit: () => void }>) => {
  const newThreshold = params[ChangeThresholdFlowFieldNames.threshold]

  const { setSafeTx, setSafeTxError } = useContext(SafeTxContext)

  useEffect(() => {
    createUpdateThresholdTx(newThreshold).then(setSafeTx).catch(setSafeTxError)
  }, [newThreshold, setSafeTx, setSafeTxError])

  const handleSubmit = () => {
    onSubmit()
  }

  return <ReviewTransaction onSubmit={handleSubmit}>{children}</ReviewTransaction>
}

export default ReviewChangeThreshold
