import type { NextPage } from 'next'
import Head from 'next/head'
import TxHeader from '@/components/transactions/TxHeader'
import { Box, Typography } from '@mui/material'
import { BRAND_NAME } from '@/config/constants'

const History: NextPage = () => {
  return (
    <>
      <Head>
        <title>{`${BRAND_NAME} – Transaction history`}</title>
      </Head>

      <TxHeader />

      <main>
        <Box mb={4}>
          <Typography variant="body1" color="text.secondary">
            Transaction history is currently a work in progress.
          </Typography>
        </Box>
      </main>
    </>
  )
}

export default History
