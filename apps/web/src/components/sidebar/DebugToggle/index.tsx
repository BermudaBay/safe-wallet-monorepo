import { type ReactElement } from 'react'
import { Box, FormControlLabel, Switch } from '@mui/material'
import { setDarkMode } from '@/store/settingsSlice'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useAppDispatch } from '@/store'

const DebugToggle = (): ReactElement => {
  const dispatch = useAppDispatch()
  const isDarkMode = useDarkMode()

  return (
    <Box py={2} ml={2}>
      <FormControlLabel
        control={<Switch checked={isDarkMode} onChange={(_, checked) => dispatch(setDarkMode(checked))} />}
        label="Dark mode"
      />
    </Box>
  )
}

export default DebugToggle
