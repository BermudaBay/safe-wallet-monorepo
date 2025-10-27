import type { NextPage } from 'next'
import Head from 'next/head'
import { BRAND_NAME } from '@/config/constants'

const PrivacyPolicy: NextPage = () => {
  return (
    <>
      <Head>
        <title>{`${BRAND_NAME} – Privacy policy`}</title>
      </Head>

      <main style={{ lineHeight: '1.5' }}>Privacy Policy</main>
    </>
  )
}

export default PrivacyPolicy
