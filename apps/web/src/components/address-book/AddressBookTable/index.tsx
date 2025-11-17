import React, { useCallback, useContext, useState } from 'react'
import { Box, Typography } from '@mui/material'
import type { ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'
import { useAsyncMemo } from '@/utils/misc'
import EnhancedTable from '@/components/common/EnhancedTable'
import type { AddressEntry } from '@/components/address-book/EntryDialog'
import EntryDialog from '@/components/address-book/EntryDialog'
import ExportDialog from '@/components/address-book/ExportDialog'
import ImportDialog from '@/components/address-book/ImportDialog'
import EditIcon from '@/public/images/common/edit.svg'
import DeleteIcon from '@/public/images/common/delete.svg'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import RemoveDialog from '@/components/address-book/RemoveDialog'
import EthHashInfo from '@/components/common/EthHashInfo'
import AddressBookHeader from '../AddressBookHeader'
import useAddressBook from '@/hooks/useAddressBook'
import Track from '@/components/common/Track'
import { ADDRESS_BOOK_EVENTS } from '@/services/analytics/events/addressBook'
import SvgIcon from '@mui/material/SvgIcon'
import PagePlaceholder from '@/components/common/PagePlaceholder'
import NoEntriesIcon from '@/public/images/address-book/no-entries.svg'
import { useCurrentChain } from '@/hooks/useChains'
import tableCss from '@/components/common/EnhancedTable/styles.module.css'
import { TxModalContext, type TxModalContextType } from '@/components/tx-flow'
import { TokenTransferFlow } from '@/components/tx-flow/flows'
import CheckWallet from '@/components/common/CheckWallet'
import madProps from '@/utils/mad-props'
import { useBermuda } from '@/contexts/bermuda-context'
import { shortenAddress } from '@/utils/misc'
import { copyToClipboard } from '@/components/settings/ShieldedAccount/utils'

const headCells = [
  { id: 'name', label: 'Name' },
  { id: 'address', label: 'Address' },
  { id: 'actions', label: '' },
]

export enum ModalType {
  EXPORT = 'export',
  IMPORT = 'import',
  ENTRY = 'entry',
  REMOVE = 'remove',
}

const defaultOpen = {
  [ModalType.EXPORT]: false,
  [ModalType.IMPORT]: false,
  [ModalType.ENTRY]: false,
  [ModalType.REMOVE]: false,
}

type AddressBookTableProps = {
  chain?: ChainInfo
  setTxFlow: TxModalContextType['setTxFlow']
}

function AddressBookTable({ chain, setTxFlow }: AddressBookTableProps) {
  const { sdk } = useBermuda()
  const [open, setOpen] = useState<typeof defaultOpen>(defaultOpen)
  const [searchQuery, setSearchQuery] = useState('')
  const [defaultValues, setDefaultValues] = useState<AddressEntry | undefined>(undefined)

  const resolveToBermudaAddress = useCallback(
    async (address: string) => {
      if (sdk) {
        const name = await sdk.registry.nameOfNativeAddress(address)
        // We check if length is > 2, because an "empty result" is `0x`.
        if (name.length > 2) {
          return name
        }

        const shieldedAddress = await sdk.registry.shieldedAddressOf(address)
        // We check if length is > 2, because an "empty result" is `0x`.
        if (shieldedAddress.length > 2) {
          return shieldedAddress
        }

        return null
      }
    },
    [sdk],
  )

  const handleOpenModal = (type: keyof typeof open) => () => {
    setOpen((prev) => ({ ...prev, [type]: true }))
  }

  const handleOpenModalWithValues = (modal: ModalType, address: string, name: string) => {
    setDefaultValues({ address, name })
    handleOpenModal(modal)()
  }

  const handleClose = () => {
    setOpen(defaultOpen)
    setDefaultValues(undefined)
  }

  const addressBook = useAddressBook()
  const addressBookEntries = Object.entries(addressBook)
  const filteredEntries =
    useAsyncMemo(async () => {
      if (sdk && addressBookEntries.length) {
        const enhancedEntries = []

        for (const entry of addressBookEntries) {
          const address = entry[0]
          const resolved = await resolveToBermudaAddress(address)

          if (resolved) {
            enhancedEntries.push([...entry, resolved])
          } else {
            enhancedEntries.push([...entry])
          }
        }

        if (!searchQuery) {
          return enhancedEntries
        }

        const query = searchQuery.toLowerCase()
        return enhancedEntries.filter(([address, name]) => {
          return address.toLowerCase().includes(query) || name.toLowerCase().includes(query)
        })
      }
    }, [searchQuery, sdk, resolveToBermudaAddress]) || []

  const rows = filteredEntries.map(([nativeAddress, name, bermudaAddress]) => ({
    cells: {
      name: {
        rawValue: name,
        content: name,
        mobileLabel: 'Name',
      },
      address: {
        rawValue: nativeAddress,
        mobileLabel: 'Address',
        content: (
          <>
            <EthHashInfo address={nativeAddress} showName={false} shortAddress={false} hasExplorer showCopyButton />
            {bermudaAddress && (
              <Typography
                sx={{ ml: '47px', fontSize: '14px' }}
                onClick={(e) => copyToClipboard(bermudaAddress, e)}
                style={{ cursor: 'copy' }}
              >
                <Typography fontWeight="bold" sx={{ fontSize: 'inherit', display: 'inline' }}>
                  dev:
                </Typography>
                {bermudaAddress.startsWith('0x') ? `bay:${shortenAddress(bermudaAddress, 20)}` : bermudaAddress}
              </Typography>
            )}
          </>
        ),
      },
      actions: {
        rawValue: '',
        sticky: true,
        content: (
          <div className={tableCss.actions}>
            <Track {...ADDRESS_BOOK_EVENTS.EDIT_ENTRY}>
              <Tooltip title="Edit entry" placement="top">
                <IconButton
                  onClick={() => handleOpenModalWithValues(ModalType.ENTRY, nativeAddress, name)}
                  size="small"
                >
                  <SvgIcon component={EditIcon} inheritViewBox color="border" fontSize="small" />
                </IconButton>
              </Tooltip>
            </Track>

            <Track {...ADDRESS_BOOK_EVENTS.DELETE_ENTRY}>
              <Tooltip title="Delete entry" placement="top">
                <IconButton
                  onClick={() => handleOpenModalWithValues(ModalType.REMOVE, nativeAddress, name)}
                  size="small"
                >
                  <SvgIcon component={DeleteIcon} inheritViewBox color="error" fontSize="small" />
                </IconButton>
              </Tooltip>
            </Track>

            <CheckWallet>
              {(isOk) => (
                <Track {...ADDRESS_BOOK_EVENTS.SEND}>
                  <Button
                    data-testid="send-btn"
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => setTxFlow(<TokenTransferFlow recipients={[{ recipient: nativeAddress }]} />)}
                    disabled={!isOk}
                  >
                    Send
                  </Button>
                </Track>
              )}
            </CheckWallet>
          </div>
        ),
      },
    },
  }))

  return (
    <>
      <AddressBookHeader
        handleOpenModal={handleOpenModal}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <main>
        {filteredEntries.length > 0 ? (
          <EnhancedTable rows={rows} headCells={headCells} mobileVariant />
        ) : (
          <Box bgcolor="background.paper" borderRadius={1}>
            <PagePlaceholder
              img={<NoEntriesIcon />}
              text={`No entries found${chain ? ` on ${chain.chainName}` : ''}`}
            />
          </Box>
        )}
      </main>

      {open[ModalType.EXPORT] && <ExportDialog handleClose={handleClose} />}

      {open[ModalType.IMPORT] && <ImportDialog handleClose={handleClose} />}

      {open[ModalType.ENTRY] && (
        <EntryDialog
          handleClose={handleClose}
          defaultValues={defaultValues}
          disableAddressInput={Boolean(defaultValues?.name)}
        />
      )}

      {open[ModalType.REMOVE] && <RemoveDialog handleClose={handleClose} address={defaultValues?.address || ''} />}
    </>
  )
}

const useSetTxFlow = () => useContext(TxModalContext).setTxFlow

export default madProps(AddressBookTable, {
  chain: useCurrentChain,
  setTxFlow: useSetTxFlow,
})
