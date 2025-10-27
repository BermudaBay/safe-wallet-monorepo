import type { ReactElement } from 'react'
import { Fragment } from 'react'
import { type EventLabel } from '@/services/analytics'

type Props = {
  children: ReactElement
  as?: 'span' | 'div'
  category: string
  action: string
  label?: EventLabel
}
const Track = ({ children, as: Wrapper = 'span', ...trackData }: Props): typeof children => {
  if (children.type === Fragment) {
    throw new Error('Fragments cannot be tracked.')
  }

  return <Wrapper data-track={`${trackData.category}: ${trackData.action}`}>{children}</Wrapper>
}

export default Track
