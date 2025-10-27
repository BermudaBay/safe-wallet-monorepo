import type { NextPage } from 'next'
import Head from 'next/head'
import { BRAND_NAME } from '@/config/constants'

const CookiePolicy: NextPage = () => {
  return (
    <>
      <Head>
        <title>{`${BRAND_NAME} – Cookie policy`}</title>
      </Head>

      <main style={{ lineHeight: '1.5' }}>Cookie Policy</main>
    </>
  )
}

export default CookiePolicy
