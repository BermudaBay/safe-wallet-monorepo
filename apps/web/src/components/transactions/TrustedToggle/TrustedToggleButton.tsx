import { type ReactElement } from 'react'
import { FormControlLabel, Switch } from '@mui/material'

const _TrustedToggleButton = ({
  onlyTrusted,
  setOnlyTrusted,
  hasDefaultTokenlist,
}: {
  onlyTrusted: boolean
  setOnlyTrusted: (on: boolean) => void
  hasDefaultTokenlist?: boolean
}): ReactElement | null => {
  const onClick = () => {
    setOnlyTrusted(!onlyTrusted)
  }

  if (!hasDefaultTokenlist) {
    return null
  }

  return (
    <FormControlLabel
      data-testid="toggle-untrusted"
      control={<Switch checked={onlyTrusted} onChange={onClick} />}
      label={<>Hide suspicious</>}
    />
  )
}

export default _TrustedToggleButton
