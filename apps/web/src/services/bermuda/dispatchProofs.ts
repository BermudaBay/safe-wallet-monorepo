import { TransactionSummary } from "@safe-global/safe-gateway-typescript-sdk";
import { queryFilterBatched } from "./utils";
import { Contract, getBytes } from "ethers";
import { getBermudaSDK } from "@/hooks/bermudaSDK/useBermudaSDK";

export async function dispatchProofs(shieldedKeyPair: any, safeAddress: string, txSummary: TransactionSummary) {
    // const { safeAddress } = useSafeInfo()
    const bermudaSDK = getBermudaSDK()

    // List all MessageCiphertext events, try decrypt, then decode, then stxhash
    // If the resulting stxhash is included in txSummary.data (SignMsgHash data) 
    // its most likely the preimage corresponding to the stx hash that got 
    // "signed" thru the multisig 
    console.log("$$$$$ txSummary.txHash", txSummary.txHash)
    const signMsgHashTx = await bermudaSDK.config.provider.getTransaction(txSummary.txHash)
    if (!signMsgHashTx) throw Error("Cannot find SignMsgHashLib tx")

    const encryptionKey = shieldedKeyPair.x25519.secretKey
    const topic = bermudaSDK.utils.calcMessageCiphertextTopic({
        chainId: bermudaSDK.config.chainId,
        safeAddress,
        secretKey: encryptionKey
    })

    const toBlock = await bermudaSDK.config.provider.getBlockNumber()
    const signMsgHashLib = new Contract(
        bermudaSDK.config.signMsgHashLib,
        bermudaSDK.abis.SIGN_MESSAGE_HASH_LIB_ABI,
        { provider: bermudaSDK.config.provider }
    )

    const ciphertexts = await queryFilterBatched(
        0n,
        toBlock,
        signMsgHashLib,
        // indexing by topic returns an empty result
        signMsgHashLib.filters.MessageCiphertext(null/*topic*/, null)
    )
        .then(events => events.map(e => e.args.ciphertext))
    console.log("ciphertexts", ciphertexts)
    let stx
    for (const c of ciphertexts) {
        const plaintext = bermudaSDK.utils.decryptMessageCiphertext(encryptionKey, getBytes(c))
        const decoded = bermudaSDK.utils.decodeStx(bermudaSDK.utils.hex(plaintext))
        console.log("$$$$$ decoded", decoded)
        const stxHash = bermudaSDK.safe.stxHash(decoded)
        if (signMsgHashTx.data.includes(stxHash.slice(2))) {
            stx = decoded
            break
        }
    }
    if (!stx) throw Error("Cannot find stx hash preimage")

    //TODO
    // export async function prepareTransact({
    //   pool,
    //   fee = 0n,
    //   inputs = [],
    //   outputs = [],
    //   unwrap = false,
    //   token = ZeroAddress,
    //   funder = ZeroAddress,
    //   relayer = ZeroAddress,
    //   recipient = ZeroAddress,
    //   merkleTreeHeight,
    //   fromBlock,
    //   toBlock,
    //   safeModule
    //   // feeToken,
    // }: ITransactInputs): Promise<IProofArtifacts>

    const utxos = await bermudaSDK.utils
        .findUtxosUpTo({
            pool: bermudaSDK.config.pool,
            keypair: shieldedKeyPair,
            token: stx.token,
            amount: stx.spendingLimit
        })

    const inputs = utxos.filter((u: any) => stx.inputNullifiers.includes(u.getNullifier()))
    if (!inputs.length) throw Error("Cannot find input nullifiers")

    const output0: any = {}
    const output1: any = {}
    if (shieldedKeyPair.address().startsWith(bermudaSDK.utils.hex(stx.outputPubkeys[0], 32))) {
        output0.keypair = shieldedKeyPair
        output1.keypair = bermudaSDK.types.KeyPair.fromString(bermudaSDK.utils.hex(stx.outputPubkeys[1], 32) + "0".repeat(64))
        output0.safe = safeAddress
    } else if (shieldedKeyPair.address().startsWith(bermudaSDK.utils.hex(stx.outputPubkeys[1], 32))) {
        output1.keypair = shieldedKeyPair
        output0.keypair = bermudaSDK.types.KeyPair.fromString(bermudaSDK.utils.hex(stx.outputPubkeys[0], 32) + "0".repeat(64))
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

    const { args, extData } = await bermudaSDK.core.prepareTransact({
        inputs,
        outputs,
        token: stx.token
    })

    //TODO pack transact payload

    //TODO relay

    alert("services>bermuda>dispatchProofs")
}
