import ExternalStore from '@safe-global/utils/services/ExternalStore'
import bermuda from "@bermuda/sdk"

export const initBermudaSDK = async ({
    chainId,
    ...opts
}: { chainId: number | bigint | string, [key: string]: any }): Promise<any | undefined> => {
    let sdkInitializer = ""
    if (Number(chainId) === 31337) {
        sdkInitializer = "pull-poc" //FIXME use "testenv"
    } else if (Number(chainId) === 84532) {
        sdkInitializer = "base-sepolia"
    } else {
        throw Error(`Unsupported chain id ${chainId}`)
    }

    return bermuda(sdkInitializer, opts)
}

export const {
    getStore: getBermudaSDK,
    setStore: setBermudaSDK,
    useStore: useBermudaSDK,
} = new ExternalStore<any | undefined>()
