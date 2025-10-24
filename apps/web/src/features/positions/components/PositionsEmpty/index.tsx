import { useRouter } from 'next/router'
import Link from 'next/link'
import { Button, Paper, Typography } from '@mui/material'
import DefiIcon from '@/public/images/balances/defi.svg'
import { AppRoutes } from '@/config/routes'
import { useIsEarnPromoEnabled } from '@/features/earn/hooks/useIsEarnFeatureEnabled'

const PositionsEmpty = () => {
  const router = useRouter()
  const isEarnFeatureEnabled = useIsEarnPromoEnabled()

  return (
    <Paper elevation={0} sx={{ p: 3, textAlign: 'center' }}>
      <DefiIcon />

      <Typography data-testid="no-tx-text" variant="body1" color="primary.light">
        You have no active DeFi positions yet
      </Typography>

      {isEarnFeatureEnabled && (
        <Link href={{ pathname: AppRoutes.earn, query: { safe: router.query.safe } }} passHref>
          <Button size="small" sx={{ mt: 1 }}>
            Explore Earn
          </Button>
        </Link>
      )}
    </Paper>
  )
}

export default PositionsEmpty
