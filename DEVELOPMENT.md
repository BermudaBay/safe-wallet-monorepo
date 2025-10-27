# Development

Use the following steps to get the webapp running on your local machine:

1. `git clone <url>`
2. `cd safe-wallet-monorepo`
3. Update the `NEXT_PUBLIC_INFURA_TOKEN` in `apps/web/.env`
4. `corepack enable`
5. `yarn install`
6. `yarn workspace @safe-global/web dev`
