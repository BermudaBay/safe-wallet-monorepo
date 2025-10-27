import path from 'path'
import { execSync } from 'child_process'

let commitHash = process.env.NEXT_PUBLIC_COMMIT_HASH
if (!commitHash) {
  try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    commitHash = ''
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // static site export

  transpilePackages: ['@safe-global/store'],
  images: {
    unoptimized: true,
  },

  env: {
    NEXT_PUBLIC_COMMIT_HASH: commitHash,
  },

  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  reactStrictMode: false,
  productionBrowserSourceMaps: true,
  eslint: {
    dirs: ['src'],
  },
  webpack(config, { dev }) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: { and: [/\.(js|ts)x?$/] },
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            prettier: false,
            svgo: false,
            svgoConfig: {
              plugins: [
                {
                  name: 'preset-default',
                  params: {
                    overrides: { removeViewBox: false },
                  },
                },
              ],
            },
            titleProp: true,
          },
        },
      ],
    })

    config.resolve.alias = {
      ...config.resolve.alias,
      'bn.js': path.resolve('../../node_modules/bn.js/lib/bn.js'),
      'mainnet.json': path.resolve('../..node_modules/@ethereumjs/common/dist.browser/genesisStates/mainnet.json'),
      '@mui/material$': path.resolve('./src/components/common/Mui'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    }

    if (dev) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          customModule: {
            test: /[\\/]..[\\/]..[\\/]node_modules[\\/](@safe-global|ethers)[\\/]/,
            name: 'protocol-kit-ethers',
            chunks: 'all',
          },
        },
      }
      config.optimization.minimize = false
    }

    return config
  },
}

export default nextConfig
