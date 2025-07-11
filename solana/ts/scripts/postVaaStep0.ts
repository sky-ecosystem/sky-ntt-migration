import "dotenv/config";

import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction
} from "@solana/web3.js";

import {
    isVersionedTransaction,
} from "@wormhole-foundation/sdk-solana";
import bs58 from "bs58";
import {
    SolanaWormholeCore,
    utils,
} from "@wormhole-foundation/sdk-solana-core";

import { wormhole } from "@wormhole-foundation/sdk";
import solana from "@wormhole-foundation/sdk/solana";
import evm from "@wormhole-foundation/sdk/evm";
import { chainToBytes, derivePda, U64 } from "../lib/utils.js";

const REPLAY_SEED = new TextEncoder().encode('replay');

async function main() {
    if (process.env['SOLANA_PRIVATE_KEY'] === undefined) {
        throw new Error("SOLANA_PRIVATE_KEY is not set");
    }

    if (process.argv.length < 3) {
        throw new Error("Please provide a txId as a command line argument");
    }
    const txId = process.argv[2]!;

    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const key = bs58.decode(process.env['SOLANA_PRIVATE_KEY']);
    const payer = Keypair.fromSecretKey(key);

    const wh = await wormhole("Testnet", [evm, solana]);
    const chain = wh.getChain("Solana");
    const contracts = (await chain.getWormholeCore() as any).contracts;
    const core = new SolanaWormholeCore("Testnet", "Solana", connection, contracts);

    const vaa = await wh.getVaa(
        txId,
        "GeneralPurposeGovernance:GeneralPurposeSolana",
        25 * 60 * 1000
    );

    if (!vaa) {
        throw new Error("VAA not found");
    }

    for await (const tx of core.postVaa(payer.publicKey, vaa)) {
        if (isVersionedTransaction(tx)) {
            throw new Error("Versioned transaction not supported");
        }

        console.log('Sending transaction: ', tx.description);
        const solanaTx = tx.transaction.transaction as Transaction;
        solanaTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        solanaTx.sign(...[...tx.transaction.signers ?? [], payer]);
        const serializedTx = solanaTx.serialize();
        console.log('serialized tx: ', serializedTx.toString('base64'));
        const txHash = await connection.sendRawTransaction(serializedTx);
        console.log("Transaction sent:", txHash);
        console.log('wait 30 seconds for finality before sending next tx\n\n')
        await new Promise(resolve => setTimeout(resolve, 30000));
    }

    const governanceProgram = new PublicKey(vaa.payload.actionArgs.governanceContract.address);
    let offset = 0;
    const bpfLoader = new PublicKey(vaa.payload.actionArgs.payload.slice(offset, offset + 32));
    offset += 34;
    const nttProgramData = new PublicKey(vaa.payload.actionArgs.payload.slice(offset, offset + 32));
    offset += 34;
    const nttProgram = new PublicKey(vaa.payload.actionArgs.payload.slice(offset, offset + 32));
    offset += 34;
    const nttProgramBuffer = new PublicKey(vaa.payload.actionArgs.payload.slice(offset, offset + 32));
    offset += 34;
    const spillAccount = new PublicKey(vaa.payload.actionArgs.payload.slice(offset, offset + 32));
    offset += 34;
    const sysvarRent = new PublicKey(vaa.payload.actionArgs.payload.slice(offset, offset + 32));
    offset += 34;
    const sysvarClock = new PublicKey(vaa.payload.actionArgs.payload.slice(offset, offset + 32));
    offset += 34;
    const signer = new PublicKey(vaa.payload.actionArgs.payload.slice(offset, offset + 32));

    console.log("governanceProgram: ", governanceProgram.toBase58());
    console.log("bpfLoader: ", bpfLoader.toBase58());
    console.log("nttProgramData: ", nttProgramData.toBase58());
    console.log("nttProgram: ", nttProgram.toBase58());
    console.log("nttProgramBuffer: ", nttProgramBuffer.toBase58());
    console.log("spillAccount: ", spillAccount.toBase58());
    console.log("sysvarRent: ", sysvarRent.toBase58());
    console.log("sysvarClock: ", sysvarClock.toBase58());
    console.log("signer: ", signer.toBase58());

    console.log("actionArgs.paylaod = ", Buffer.from(vaa.payload.actionArgs.payload).toString('hex'));
    const postedVaaAddress = utils.derivePostedVaaKey(contracts.coreBridge, Buffer.from(vaa.hash));
    console.log('Posted VAA address: ', postedVaaAddress.toBase58());

    const replayProtection = derivePda(
        [
            REPLAY_SEED,
            chainToBytes(vaa.emitterChain),
            vaa.emitterAddress.address,
            U64.toBeBytes(vaa.sequence),
        ],
        governanceProgram
    )

    const replayAccountInfo = await connection.getAccountInfo(replayProtection);

    if (replayAccountInfo !== null) {
        console.log('\nGovernance message already delivered - replay protection account exists', {
            replayProtection: replayProtection.toBase58(),
        })
        return;
    }


    // sighash("global", "governance")
    const data = Buffer.from([11, 247, 203, 189, 82, 97, 41, 84]);
    const ix = new TransactionInstruction({
        programId: governanceProgram,
        keys: [
            {
                pubkey: payer.publicKey,
                isSigner: true,
                isWritable: true
            },
            {
                pubkey: derivePda('governance', governanceProgram),
                isSigner: false,
                isWritable: true
            },
            {
                pubkey: postedVaaAddress,
                isSigner: false,
                isWritable: false
            },
            {
                pubkey: nttProgram,
                isSigner: false,
                isWritable: true
            },
            {
                pubkey: replayProtection,
                isSigner: false,
                isWritable: true
            },
            {
                pubkey: SystemProgram.programId,
                isSigner: false,
                isWritable: false
            },
            {
                pubkey: nttProgramData,
                isSigner: false,
                isWritable: true,
            },
            // // {
            // //   pubkey: nttProgram,
            // //   isSigner: false,
            // //   isWritable: true,
            // // },
            {
                pubkey: nttProgramBuffer,
                isSigner: false,
                isWritable: true,
            },
            {
                pubkey: sysvarRent,
                isSigner: false,
                isWritable: false,
            },
            {
                pubkey: sysvarClock,
                isSigner: false,
                isWritable: false,
            },
            {
                pubkey: bpfLoader,
                isSigner: false,
                isWritable: true
            },
            {
                pubkey: spillAccount,
                isSigner: false,
                isWritable: true,
            },

        ],
        data
    });
    const tx = new Transaction();
    tx.add(ix);

    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(payer);

    console.log('Delivering governance message...')

    const serializedTx = tx.serialize();
    console.log('Serialized tx: ', serializedTx.toString('base64'));

    const txHash = await connection.sendRawTransaction(serializedTx);
    console.log("Governance message delivery transaction sent:", txHash);
}

main()
