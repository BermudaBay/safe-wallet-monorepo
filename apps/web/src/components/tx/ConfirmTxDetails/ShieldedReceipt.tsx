import { Fragment, useEffect, useState, type ReactElement } from 'react'
import { Box, Divider, Stack, Typography } from '@mui/material'
import type { SafeTransaction } from '@safe-global/types-kit'
import { PaperViewToggle } from '../../common/PaperViewToggle'
import EthHashInfo from '@/components/common/EthHashInfo'
import { type TransactionDetails, type TransactionData } from '@safe-global/safe-gateway-typescript-sdk'
import { HexEncodedData } from '@/components/transactions/HexEncodedData'
import {
  useDomainHash,
  useMessageHash,
  useSafeTxHash,
} from '@/components/transactions/TxDetails/Summary/SafeTxHashDataRow'
import TxDetailsRow from './TxDetailsRow'
import NameChip from './NameChip'
import { JsonView } from './JsonView'
import { useBermuda } from '@/contexts/bermuda-context'
import { Contract, ZeroAddress, formatUnits, isAddress } from 'ethers'
import { type SafeStxHashParams } from '@/services/bermuda/types'

type ShieldedReceiptProps = {
  safeTxData: SafeTransaction['data']
  shieldedTxData: SafeStxHashParams
  txData?: TransactionData
  txInfo?: TransactionDetails['txInfo']
  grid?: boolean
}

const ScrollWrapper = ({ children }: { children: ReactElement | ReactElement[] }) => (
  <Box sx={{ maxHeight: '550px', flex: 1, overflowY: 'auto', px: 2, pt: 1, mt: '0 !important' }}>{children}</Box>
)

export const ShieldedReceipt = ({ safeTxData, shieldedTxData, txData, txInfo, grid }: ShieldedReceiptProps) => {
  const { sdk } = useBermuda()
  const safeTxHash = useSafeTxHash({ safeTxData })
  const domainHash = useDomainHash()
  const messageHash = useMessageHash({ safeTxData })
  const [stxHash, setStxHash] = useState<string | undefined>()
  const [decimals, setDecimals] = useState<number | undefined>()
  const [recipient, setRecipient] = useState<string | undefined>()
  const [poolAddress, setPoolAddress] = useState<string | undefined>()

  useEffect(() => {
    async function run() {
      const poolAddress = await sdk.config.pool.getAddress()
      setPoolAddress(poolAddress)

      const hash = sdk.safe.stxHash(shieldedTxData)
      setStxHash(hash)

      const token = new Contract(
        shieldedTxData.token,
        ['function decimals() view returns (uint8)'],
        { provider: sdk.config.provider }
      )

      setDecimals(await token.decimals())

      // If the recipient is the zero address, then we're dealing with a
      // shielded deposit or shielded transfer.
      if (shieldedTxData.recipient.toLowerCase() === ZeroAddress) {
        const outputPubKey = shieldedTxData.outputPubkeys[0]

        let prefix = sdk.utils.hex(outputPubKey, 32)
        let address = prefix + '0'.repeat(64)

        // Try to resolve shielded address (and potential name) via registry.
        // If no result was found, then use the output pubkey padded with zeros.
        let name = undefined
        await sdk.registry.load()
        const resolvedAddress = sdk.config.peers.find((peer: any) => peer.startsWith(prefix))!
        if (resolvedAddress) {
          address = resolvedAddress
          name = await sdk.registry.nameOfShieldedAddress(resolvedAddress)
        }

        setRecipient(name?.length ? name : address)
      } else {
        setRecipient(shieldedTxData.recipient)
      }
    }

    if (sdk && shieldedTxData) {
      run()
    }
  }, [sdk, shieldedTxData])

  // NOTE: The amount is the spending limit for deposits and withdrawals but for
  // internal transfers it's the first output utxo which is the recipient's
  // amount.
  let amount = formatUnits(shieldedTxData.spendingLimit, decimals)
  if (shieldedTxData.spendingLimit === 0n) {
    amount = formatUnits(shieldedTxData.outputAmounts[0], decimals)
  }

  const ToWrapper = grid ? Box : Fragment

  if (!poolAddress || !recipient || !stxHash) return <></>

  return (
    <PaperViewToggle activeView={0} leftAlign={grid}>
      {[
        {
          title: 'Data',
          content: (
            <ScrollWrapper>
              <Stack spacing={1} divider={<Divider />}>
                <TxDetailsRow label="Target" grid={grid}>
                  <ToWrapper>
                    <NameChip txData={txData} txInfo={txInfo} />
                    <Typography
                      variant="body2"
                      mt={grid ? 0.75 : 0}
                      width={grid ? undefined : '100%'}
                      sx={{
                        '& *': { whiteSpace: 'normal', wordWrap: 'break-word', alignItems: 'flex-start !important' },
                      }}
                    >
                      <EthHashInfo
                        address={poolAddress}
                        avatarSize={20}
                        showPrefix={false}
                        showName={true}
                        shortAddress={false}
                        hasExplorer
                        showAvatar
                        highlight4bytes
                      />
                    </Typography>
                  </ToWrapper>
                </TxDetailsRow>

                <TxDetailsRow label="Token" grid={grid}>
                  <Typography variant="body2">
                    <EthHashInfo
                      address={shieldedTxData.token}
                      avatarSize={20}
                      showPrefix={false}
                      showName={false}
                      shortAddress
                      hasExplorer
                    />
                  </Typography>
                </TxDetailsRow>

                <TxDetailsRow label="Amount" grid={grid}>
                  {amount}
                </TxDetailsRow>

                <TxDetailsRow label="Recipient" grid={grid}>
                  <Typography variant="body2">
                    <EthHashInfo
                      address={recipient}
                      avatarSize={20}
                      showPrefix={false}
                      shortAddress
                      showName={true}
                      hasExplorer={isAddress(recipient)}
                    />
                  </Typography>
                </TxDetailsRow>
              </Stack>
            </ScrollWrapper>
          ),
        },
        {
          title: 'Hashes',
          content: (
            <ScrollWrapper>
              <Stack spacing={1} divider={<Divider />}>
                {stxHash && (
                  <TxDetailsRow label="Shielded Transaction hash" grid={grid}>
                    <Typography variant="body2" width="100%" sx={{ wordWrap: 'break-word' }}>
                      <HexEncodedData hexData={stxHash} limit={66} highlightFirstBytes={false} />
                    </Typography>
                  </TxDetailsRow>
                )}

                {domainHash && (
                  <TxDetailsRow label="Domain hash" grid={grid}>
                    <Typography variant="body2" width="100%" sx={{ wordWrap: 'break-word' }}>
                      <HexEncodedData hexData={domainHash} limit={66} highlightFirstBytes={false} />
                    </Typography>
                  </TxDetailsRow>
                )}

                {messageHash && (
                  <TxDetailsRow label="Message hash" grid={grid}>
                    <Typography variant="body2" width="100%" sx={{ wordWrap: 'break-word' }}>
                      <HexEncodedData hexData={messageHash} limit={66} highlightFirstBytes={false} />
                    </Typography>
                  </TxDetailsRow>
                )}

                {safeTxHash && (
                  <TxDetailsRow label="safeTxHash" grid={grid}>
                    <Typography variant="body2" width="100%" sx={{ wordWrap: 'break-word' }}>
                      <HexEncodedData hexData={safeTxHash} limit={66} highlightFirstBytes={false} />
                    </Typography>
                  </TxDetailsRow>
                )}
              </Stack>
            </ScrollWrapper>
          ),
        },
        {
          title: 'JSON',
          content: (
            <ScrollWrapper>
              <JsonView data={safeTxData} />
            </ScrollWrapper>
          ),
        },
      ]}
    </PaperViewToggle>
  )
}
