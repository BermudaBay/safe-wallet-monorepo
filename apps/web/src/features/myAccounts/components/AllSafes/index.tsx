import ConnectWalletButton from '@/components/common/ConnectWallet/ConnectWalletButton'
import SafesList from '@/features/myAccounts/components/SafesList'
import type { AllSafeItems } from '@/features/myAccounts/hooks/useAllSafesGrouped'
import css from '@/features/myAccounts/styles.module.css'
import useWallet from '@/hooks/wallets/useWallet'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material'

const AllSafes = ({
  allSafes,
  onLinkClick,
  isSidebar,
}: {
  allSafes: AllSafeItems
  onLinkClick?: () => void
  isSidebar: boolean
}) => {
  const wallet = useWallet()

  return (
    <Accordion sx={{ border: 'none' }} defaultExpanded={!isSidebar} slotProps={{ transition: { unmountOnExit: true } }}>
      <AccordionSummary
        data-testid="expand-safes-list"
        expandIcon={<ExpandMoreIcon sx={{ '& path': { fill: 'var(--color-text-secondary)' } }} />}
        sx={{
          padding: 0,
          '& .MuiAccordionSummary-content': { margin: '0 !important', mb: 1, flexGrow: 0 },
        }}
        component="div"
      >
        <div className={css.listHeader}>
          <Typography variant="h5" fontWeight={700}>
            Accounts
            {allSafes && allSafes.length > 0 && (
              <Typography component="span" color="text.secondary" fontSize="inherit" fontWeight="normal" mr={1}>
                {' '}
                ({allSafes.length})
              </Typography>
            )}
          </Typography>
        </div>
      </AccordionSummary>
      <AccordionDetails data-testid="accounts-list" sx={{ padding: 0 }}>
        {allSafes.length > 0 ? (
          <Box mt={1}>
            <SafesList safes={allSafes} onLinkClick={onLinkClick} />
          </Box>
        ) : (
          <Typography
            data-testid="empty-account-list"
            component="div"
            variant="body2"
            color="text.secondary"
            textAlign="center"
            py={3}
            mx="auto"
            width={250}
          >
            {!wallet ? (
              <>
                <Box mb={2}>Connect a wallet to view your Safe Accounts or to create a new one</Box>
                <ConnectWalletButton text="Connect a wallet" contained />
              </>
            ) : (
              "You don't have any safes yet"
            )}
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

export default AllSafes
