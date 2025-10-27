import type { ReactElement } from 'react'
import { AppRoutes } from '@/config/routes'
import { useRouter } from 'next/router'
import type { CopyDeeplinkLabels } from '@/services/analytics'
import React from 'react'
import CopyTooltip from '@/components/common/CopyTooltip'
import useOrigin from '@/hooks/useOrigin'

const TxShareLink = ({
  id,
  children,
}: {
  id: string
  children: ReactElement
  eventLabel: CopyDeeplinkLabels
}): ReactElement => {
  const router = useRouter()
  const { safe = '' } = router.query
  const href = `${AppRoutes.transactions.tx}?safe=${safe}&id=${id}`
  const txUrl = useOrigin() + href

  return (
    <CopyTooltip text={txUrl} initialToolTipText="Copy the transaction URL">
      {children}
    </CopyTooltip>
  )
}

export default TxShareLink
