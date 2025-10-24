import css from '@/features/spaces/components/Dashboard/styles.module.css'
import LightbulbIcon from '@/public/images/common/lightbulb.svg'
import { Typography, Paper, Box, Button, SvgIcon } from '@mui/material'
import SpaceInfoModal from '../SpaceInfoModal'
import { useState } from 'react'

const SpacesCTACard = () => {
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false)

  const handleLearnMore = () => {
    setIsInfoOpen(true)
  }

  return (
    <>
      <Paper sx={{ p: 3, borderRadius: '12px', height: '100%' }}>
        <Box position="relative" width={1}>
          <Box className={css.iconBG}>
            <SvgIcon component={LightbulbIcon} inheritViewBox />
          </Box>

          <Button
            onClick={handleLearnMore}
            variant="outlined"
            size="compact"
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
            }}
            aria-label="Invite team members"
          >
            Learn more
          </Button>
        </Box>
        <Box>
          <Typography variant="body1" color="text.primary" fontWeight={700} mb={1}>
            Explore spaces
          </Typography>
          <Typography variant="body2" color="primary.light">
            Seamlessly use your Safe Accounts from one place and collaborate with your team members.
          </Typography>
        </Box>
      </Paper>
      {isInfoOpen && <SpaceInfoModal showButtons={false} onClose={() => setIsInfoOpen(false)} />}
    </>
  )
}

export default SpacesCTACard
