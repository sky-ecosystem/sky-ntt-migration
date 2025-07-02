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
import { derivePda, U64 } from "../lib/utils.js";

const GOVERNANCE_PROGRAM_ID = new PublicKey('67Wtx1DsvHZtL8iMpaJceqnNrHQuoxHqd9pLRCMqFyFz');

async function *main() {
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
  // const core = await chain.getWormholeCore() as SolanaWormholeCore<"Testnet", "Solana">;
  const contracts = (await chain.getWormholeCore() as any).contracts;
  const core = new SolanaWormholeCore("Testnet", "Solana", connection, contracts);

  const vaa = await wh.getVaa(
    txId,
    "GeneralPurposeGovernance:GeneralPurposeSolana",
    25 * 60 * 1000
  );
  console.log(vaa);

  if (!vaa) {
    throw new Error("VAA not found");
  }

  for await (const tx of core.postVaa(payer.publicKey, vaa)) {
    if (isVersionedTransaction(tx)) {
    } else {
      console.log('sender pubkey: ', payer.publicKey.toBase58());
      console.log('trying to send tx: ', tx.description);
      console.log('required signers: ', tx.transaction.signers?.map(s => s));
      const solanaTx = tx.transaction.transaction as Transaction;
      // solanaTx.feePayer = payer.publicKey;
      solanaTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      solanaTx.sign(...[...tx.transaction.signers ?? [], payer]);
      const serializedTx = solanaTx.serialize();
      console.log('serialized tx: ', serializedTx.toString('base64'));
      const txHash = await connection.sendRawTransaction(serializedTx);
      console.log("Transaction sent:", txHash);
      console.log('wait 30 seconds for finality before sending next tx')
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }

  const postedVaaAddress = utils.derivePostedVaaKey(contracts.coreBridge, Buffer.from(vaa.hash));
  console.log('posted VAA address: ', postedVaaAddress.toBase58());

  // governance 

  // sighash("global", "governance")
  const data = Buffer.from([11, 247, 203, 189, 82, 97, 41, 84]);
  const ix = new TransactionInstruction({
    programId: GOVERNANCE_PROGRAM_ID,
    keys: [
      // payer
      {
        pubkey: payer.publicKey,
        isSigner: true,
        isWritable: true
      },
      // governance PDA
      {
        pubkey: derivePda('governance', GOVERNANCE_PROGRAM_ID),
        isSigner: false,
        isWritable: true
      },
      // vaa
      {
        pubkey: postedVaaAddress,
        isSigner: false,
        isWritable: false
      },
      // program
      {
        pubkey: new PublicKey('3ynNB373Q3VAzKp7m4x238po36hjAGFXFJB4ybN2iTyg'),
        isSigner: false,
        isWritable: true
      },
      // replay protection
      {
        pubkey: derivePda(
          [
            Uint8Array.from([114, 101, 112, 108, 97, 121]),
            Uint8Array.from([0, 6]),
            Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 4, 166, 226, 121, 143, 66, 199, 243, 201, 114, 21, 221, 249, 88, 213, 80, 15, 142, 200]),
            U64.toBeBytes(vaa.sequence),
          ],
          GOVERNANCE_PROGRAM_ID
        ),
        isSigner: false,
        isWritable: true
      },
      // system program
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

  const serializedTx = tx.serialize();
  console.log('serialized tx: ', serializedTx.toString('base64'));

  const txHash = await connection.sendRawTransaction(serializedTx);
  console.log("Transaction sent:", txHash);

  console.log("done");
}

for await (const tx of main()) {
  console.log(tx);
}
