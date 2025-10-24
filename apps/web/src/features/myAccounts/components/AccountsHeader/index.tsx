import ConnectWalletButton from '@/components/common/ConnectWallet/ConnectWalletButton'
import { AppRoutes } from '@/config/routes'
import AccountsNavigation from '@/features/myAccounts/components/AccountsNavigation'
import CreateButton from '@/features/myAccounts/components/CreateButton'
import css from '@/features/myAccounts/styles.module.css'
import { useHasFeature } from '@/hooks/useChains'
import useWallet from '@/hooks/wallets/useWallet'
import AddIcon from '@/public/images/common/add.svg'
import { FEATURES } from '@safe-global/utils/utils/chains'
import { Box, Button, Link, SvgIcon, Typography } from '@mui/material'
import classNames from 'classnames'

const AddSafeButton = ({ onLinkClick }: { onLinkClick?: () => void }) => {
  return (
    <Link href={AppRoutes.newSafe.load}>
      <Button
        data-testid="add-safe-button"
        disableElevation
        variant="outlined"
        size="small"
        onClick={onLinkClick}
        startIcon={<SvgIcon component={AddIcon} inheritViewBox fontSize="small" />}
        sx={{ height: '36px', width: '100%', px: 2 }}
      >
        <Box mt="1px">Add</Box>
      </Button>
    </Link>
  )
}

const AccountsHeader = ({ isSidebar, onLinkClick }: { isSidebar: boolean; onLinkClick?: () => void }) => {
  const wallet = useWallet()
  const isSpacesFeatureEnabled = useHasFeature(FEATURES.SPACES)

  return (
    <Box className={classNames(css.header, { [css.sidebarHeader]: isSidebar })}>
      {isSidebar || !isSpacesFeatureEnabled ? (
        <Typography variant="h1" fontWeight={700} className={css.title}>
          Accounts
        </Typography>
      ) : (
        <AccountsNavigation />
      )}

      <Box className={css.headerButtons}>
        <AddSafeButton onLinkClick={onLinkClick} />

        {wallet ? (
          <CreateButton isPrimary />
        ) : (
          <Box sx={{ '& button': { height: '36px' } }}>
            <ConnectWalletButton small={true} />
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default AccountsHeader
