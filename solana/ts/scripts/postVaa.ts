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

import { UniversalAddress, wormhole, WormholeMessageId, Chain } from "@wormhole-foundation/sdk";
import solana from "@wormhole-foundation/sdk/solana";
import evm from "@wormhole-foundation/sdk/evm";
import { chainToBytes, derivePda, U64 } from "../lib/utils.js";

const REPLAY_SEED = new TextEncoder().encode('replay');

async function main() {
  if (process.env['SOLANA_PRIVATE_KEY'] === undefined) {
    throw new Error("SOLANA_PRIVATE_KEY is not set");
  }
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const key = bs58.decode(process.env['SOLANA_PRIVATE_KEY']);
  const payer = Keypair.fromSecretKey(key);

  const wh = await wormhole("Testnet", [evm, solana]);
  const chain = wh.getChain("Solana");
  const contracts = (await chain.getWormholeCore() as any).contracts;
  const core = new SolanaWormholeCore("Testnet", "Solana", connection, contracts);


  let wormholeMessageId: string | WormholeMessageId;

  if (process.argv.length === 3) {
    const transactionHash = process.argv[2]!;
    console.log(`Using transaction hash: ${transactionHash}`);
    wormholeMessageId = transactionHash;
  } else if (process.argv.length === 5) {
    const chain = process.argv[2]! as Chain;
    const emitter = process.argv[3]!;
    const sequence = BigInt(process.argv[4]!);
    
    console.log(`Using provided parameters: chain=${chain}, emitter=${emitter}, sequence=${sequence}`);
    
    wormholeMessageId = {
      chain: chain,
      emitter: new UniversalAddress(emitter),
      sequence: sequence
    };
  } else {
    throw new Error(
      "Usage:\n" +
      "postVaa.ts <transactionHash>\n" +
      "postVaa.ts <chain> <emitter> <sequence>"
    );
  }

  const vaa = await wh.getVaa(
    wormholeMessageId,
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
  const governedProgram = new PublicKey(vaa.payload.actionArgs.payload.slice(0, 32));

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
        pubkey: governedProgram,
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
      }
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
