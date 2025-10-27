import type { NextPage } from 'next'
import Head from 'next/head'
import { BRAND_NAME } from '@/config/constants'

const Terms: NextPage = () => {
  return (
    <>
      <Head>
        <title>{`${BRAND_NAME} – Terms`}</title>
      </Head>

      <main style={{ lineHeight: '1.5' }}>Terms of Service</main>
    </>
  )
}

export default Terms
