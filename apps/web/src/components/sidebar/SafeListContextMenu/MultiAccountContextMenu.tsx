import type { MouseEvent } from 'react'
import { useState, type ReactElement } from 'react'
import ListItemIcon from '@mui/material/ListItemIcon'
import IconButton from '@mui/material/IconButton'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import MenuItem from '@mui/material/MenuItem'
import ListItemText from '@mui/material/ListItemText'

import EntryDialog from '@/components/address-book/EntryDialog'
import EditIcon from '@/public/images/common/edit.svg'
import PlusIcon from '@/public/images/common/plus.svg'
import ContextMenu from '@/components/common/ContextMenu'
import { SvgIcon } from '@mui/material'
import { CreateSafeOnNewChain } from '@/features/multichain/components/CreateSafeOnNewChain'

enum ModalType {
  RENAME = 'rename',
  ADD_CHAIN = 'add_chain',
}

const defaultOpen = { [ModalType.RENAME]: false, [ModalType.ADD_CHAIN]: false }

const MultiAccountContextMenu = ({
  name,
  address,
  chainIds,
  addNetwork,
}: {
  name: string
  address: string
  chainIds: string[]
  addNetwork: boolean
}): ReactElement => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | undefined>()
  const [open, setOpen] = useState<typeof defaultOpen>(defaultOpen)

  const handleOpenContextMenu = (e: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) => {
    e.stopPropagation()
    setAnchorEl(e.currentTarget)
  }

  const handleCloseContextMenu = (event: MouseEvent) => {
    event.stopPropagation()
    setAnchorEl(undefined)
  }

  const handleOpenModal = (type: ModalType) => (e: MouseEvent) => {
    handleCloseContextMenu(e)
    setOpen((prev) => ({ ...prev, [type]: true }))
  }

  const handleCloseModal = () => {
    setOpen(defaultOpen)
  }

  return (
    <>
      <IconButton data-testid="safe-options-btn" edge="end" size="small" onClick={handleOpenContextMenu}>
        <MoreVertIcon sx={({ palette }) => ({ color: palette.border.main })} />
      </IconButton>
      <ContextMenu anchorEl={anchorEl} open={!!anchorEl} onClose={handleCloseContextMenu}>
        <MenuItem onClick={handleOpenModal(ModalType.RENAME)}>
          <ListItemIcon>
            <SvgIcon component={EditIcon} inheritViewBox fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText data-testid="rename-btn">Rename</ListItemText>
        </MenuItem>
        {addNetwork && (
          <MenuItem onClick={handleOpenModal(ModalType.ADD_CHAIN)}>
            <ListItemIcon>
              <SvgIcon component={PlusIcon} inheritViewBox fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText data-testid="add-chain-btn">Add another network</ListItemText>
          </MenuItem>
        )}
      </ContextMenu>

      {open[ModalType.RENAME] && (
        <EntryDialog
          handleClose={handleCloseModal}
          defaultValues={{ name, address }}
          chainIds={chainIds}
          disableAddressInput
        />
      )}

      {open[ModalType.ADD_CHAIN] && (
        <CreateSafeOnNewChain
          onClose={handleCloseModal}
          currentName={name}
          deployedChainIds={chainIds}
          open
          safeAddress={address}
        />
      )}
    </>
  )
}

export default MultiAccountContextMenu
