import { Interface, ZeroHash } from "ethers";
import { getBermudaSDK } from "@/hooks/bermudaSDK/useBermudaSDK";
import { getTransactAbis, resolveStxPreimage, shieldedAddressFromSpendingPubkey } from "./utils";
import { type TransactionSummary } from "@safe-global/safe-gateway-typescript-sdk";

export async function dispatchShieldedTransfer(shieldedKeyPair: any, safeAddress: string, txSummary: TransactionSummary) {
    const bermudaSDK = getBermudaSDK()

    const stx = await resolveStxPreimage(shieldedKeyPair, txSummary.txHash!)
    if (!stx) throw Error("Cannot find stx hash preimage")

    const utxos = await bermudaSDK.utils
        .findUtxosUpTo({
            pool: bermudaSDK.config.pool,
            keypair: shieldedKeyPair,
            token: stx.token,
            amount: stx.spendingLimit
        })

    const inputs = utxos.filter((u: any) => stx.inputNullifiers.includes(u.getNullifier()))
    if (!inputs.length) throw Error("Cannot find input nullifiers")

    while (inputs.length !== 2 && inputs.length < 16) {
        inputs.push(
            new bermudaSDK.types.Utxo({
                token: stx.token,
                safe: safeAddress,
                amount: 0n,
                keypair: shieldedKeyPair,
                blinding: 0n
            })
        )
    }

    //NOTE We load all registered peers from tehe regsitry here once
    // so that all subsequent shieldedAddressFromSpendingPubkey() invocations
    // have the fresh registry available. sdk.registry.load() internally
    // concats loaded shielded addresses to sdk.config.peers
    await bermudaSDK.registry.load()

    const registered = await bermudaSDK.registry.list()
    console.log("registered", registered.map(r => r.shieldedAddress))

    const output0: any = {}
    const output1: any = {}
    if (shieldedKeyPair.address().startsWith(bermudaSDK.utils.hex(stx.outputPubkeys[0], 32))) {
        output0.keypair = shieldedKeyPair
        output1.keypair = bermudaSDK.types.KeyPair.fromAddress(shieldedAddressFromSpendingPubkey(stx.outputPubkeys[1]))
        output0.safe = safeAddress
    } else if (shieldedKeyPair.address().startsWith(bermudaSDK.utils.hex(stx.outputPubkeys[1], 32))) {
        output1.keypair = shieldedKeyPair
        output0.keypair = bermudaSDK.types.KeyPair.fromAddress(shieldedAddressFromSpendingPubkey(stx.outputPubkeys[0]))
        output1.safe = safeAddress
    } else {
        throw Error("Cannot find output pubkey matching given shielded key pair")
    }

    if (stx.outputPubkeys[0] === stx.outputPubkeys[1]) {
        if (output0.safe) output1.safe = output0.safe
        if (output1.safe) output0.safe = output1.safe
    }

    const outputs = [
        new bermudaSDK.types.Utxo({
            ...output0,
            amount: stx.outputAmounts[0],
            token: stx.token
        }),
        new bermudaSDK.types.Utxo({
            ...output1,
            amount: stx.outputAmounts[1],
            token: stx.token
        })
    ]
    console.log("𝜟𝜟𝜟𝜟𝜟 inputs", inputs.length, inputs)
    console.log("𝜟𝜟𝜟𝜟𝜟 outputs", outputs.length, outputs)
    const { args, extData } = await bermudaSDK.core.prepareTransact({
        inputs,
        outputs,
        token: stx.token
    })
    console.log({ args, extData })

    const [_args, _extData] = bermudaSDK.utils.mapTransactArgs([args, extData])
    const target = await bermudaSDK.config.pool.getAddress()

    const abi = getTransactAbis().find((abi: any) => abi.inputs.length === 2)
    const data = bermudaSDK.config.pool.interface.encodeFunctionData(
        new Interface([abi]).getFunction('transact'),
        [
            _args,
            _extData,
            [0n, 0, ZeroHash, ZeroHash]
        ]
    )

    return bermudaSDK.utils.relay(bermudaSDK.config.relayer, {
        chainId: bermudaSDK.config.chainId,
        target,
        data
    })
}
