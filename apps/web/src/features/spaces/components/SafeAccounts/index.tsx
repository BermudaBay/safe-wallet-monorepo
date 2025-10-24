import AddAccounts from '@/features/spaces/components/AddAccounts'
import EmptySafeAccounts from '@/features/spaces/components/SafeAccounts/EmptySafeAccounts'
import { Stack, Typography } from '@mui/material'
import { useState } from 'react'
import SafesList from '@/features/myAccounts/components/SafesList'
import { useSpaceSafes } from '@/features/spaces/hooks/useSpaceSafes'
import { useSafesSearch } from '@/features/myAccounts/hooks/useSafesSearch'
import { useIsAdmin, useIsInvited } from '@/features/spaces/hooks/useSpaceMembers'
import PreviewInvite from '../InviteBanner/PreviewInvite'
import SearchInput from '../SearchInput'

const SpaceSafeAccounts = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const { allSafes } = useSpaceSafes()
  const filteredSafes = useSafesSearch(allSafes ?? [], searchQuery)
  const isAdmin = useIsAdmin()
  const isInvited = useIsInvited()

  const safes = searchQuery ? filteredSafes : allSafes

  return (
    <>
      {isInvited && <PreviewInvite />}
      <Typography variant="h1" mb={3}>
        Safe Accounts
      </Typography>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        gap={2}
        mb={3}
        flexWrap="nowrap"
        flexDirection={{ xs: 'column-reverse', md: 'row' }}
      >
        <SearchInput onSearch={setSearchQuery} />

        {isAdmin && <AddAccounts />}
      </Stack>

      {searchQuery && filteredSafes.length === 0 ? (
        <Typography variant="h5" fontWeight="normal" mb={2} color="primary.light">
          Found 0 results
        </Typography>
      ) : safes.length === 0 ? (
        <EmptySafeAccounts />
      ) : (
        <SafesList safes={safes} isSpaceSafe />
      )}
    </>
  )
}

export default SpaceSafeAccounts
