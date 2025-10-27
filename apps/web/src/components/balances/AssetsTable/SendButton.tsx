import { useContext } from 'react'
import type { TokenInfo } from '@safe-global/safe-gateway-typescript-sdk'
import { Button } from '@mui/material'
import ArrowIconNW from '@/public/images/common/arrow-top-right.svg'
import CheckWallet from '@/components/common/CheckWallet'
import useSpendingLimit from '@/hooks/useSpendingLimit'
import { TokenTransferFlow } from '@/components/tx-flow/flows'
import { TxModalContext } from '@/components/tx-flow'

const SendButton = ({ tokenInfo, light }: { tokenInfo: TokenInfo; light?: boolean }) => {
  const spendingLimit = useSpendingLimit(tokenInfo)
  const { setTxFlow } = useContext(TxModalContext)

  const onSendClick = () => {
    setTxFlow(<TokenTransferFlow recipients={[{ tokenAddress: tokenInfo.address }]} />)
  }

  return (
    <CheckWallet allowSpendingLimit={!!spendingLimit}>
      {(isOk) => (
        <Button
          data-testid="send-button"
          variant="contained"
          color={light ? 'background.paper' : 'primary'}
          size="compact"
          startIcon={<ArrowIconNW />}
          onClick={onSendClick}
          disabled={!isOk}
          sx={{ height: 32, px: 2 }}
        >
          Send
        </Button>
      )}
    </CheckWallet>
  )
}

export default SendButton
