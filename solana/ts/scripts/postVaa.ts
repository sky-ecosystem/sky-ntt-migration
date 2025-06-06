import "dotenv/config";
import * as splToken from "@solana/spl-token";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import {
  AddressLookupTableAccount,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  Signer,
  TransactionInstruction
} from "@solana/web3.js";

import { Chain, Network } from "@wormhole-foundation/sdk-base";
import {
  AccountAddress,
  ChainAddress,
  ChainsConfig,
  Contracts,
  NativeAddress,
  UnsignedTransaction,
  createVAA,
  deserialize,
  toUniversal,
} from "@wormhole-foundation/sdk-definitions";
import {
  Ntt,
  NttTransceiver,
  WormholeNttTransceiver,
} from "@wormhole-foundation/sdk-definitions-ntt";
import {
  AnySolanaAddress,
  isVersionedTransaction,
  SolanaAddress,
  SolanaChains,
  SolanaPlatform,
  SolanaPlatformType,
  SolanaTransaction,
  SolanaUnsignedTransaction,
} from "@wormhole-foundation/sdk-solana";
import bs58 from "bs58";
import {
  SolanaWormholeCore,
  utils,
} from "@wormhole-foundation/sdk-solana-core";

import { wormhole } from "@wormhole-foundation/sdk";
import solana from "@wormhole-foundation/sdk/solana";
import evm from "@wormhole-foundation/sdk/evm";
import { sha256 } from "ethers";
import { chainToBytes, derivePda } from "../lib/utils.js";

const GOVERNANCE_PROGRAM_ID = new PublicKey('67Wtx1DsvHZtL8iMpaJceqnNrHQuoxHqd9pLRCMqFyFz');

async function *main() {
  if (process.env['SOLANA_PRIVATE_KEY'] === undefined) {
    throw new Error("SOLANA_PRIVATE_KEY is not set");
  }

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const key = bs58.decode(process.env['SOLANA_PRIVATE_KEY']);
  const payer = Keypair.fromSecretKey(key);

  const wh = await wormhole("Testnet", [evm, solana]);
  const chain = wh.getChain("Solana");
  // const core = await chain.getWormholeCore() as SolanaWormholeCore<"Testnet", "Solana">;
  const contracts = (await chain.getWormholeCore() as any).contracts;
  const core = new SolanaWormholeCore("Testnet", "Solana", connection, contracts);

  const vaa = deserialize(
    'GeneralPurposeGovernance:GeneralPurposeSolana',
    Buffer.from('AQAAAAABAM14xKU3KKuBEaMvOLINADocMKYZOntIFkguP/vOCXd+FoN/Wi1hzBY2T+sEp3qC7YJ4q3nGKBPbPnp6MJKLrpwBaEGaTQAAAAEABgAAAAAAAAAAAAAAAAgEpuJ5j0LH88lyFd35WNVQD47IAAAAAAAAAAAMAAAAAAAAAABHZW5lcmFsUHVycG9zZUdvdmVybmFuY2UCAAFL9bj9fV7tE5YSjAZRYsoP1WBONIesUcuGjAXBLFGutSxDMY8Pmd/YwOvGWwsjzGYfzR32Svau8zt7g+yo5YGXAAAACK+vbR8NmJvt', 'base64') as any
  );
  console.log(vaa);

  // for await (const tx of core.postVaa(payer.publicKey, vaa)) {
  //   // console.log("Posting VAA transaction:", tx);
  //   if (isVersionedTransaction(tx)) {
  //   } else {
  //     // if (tx.description === 'Core.VerifySignature') {
  //     //   continue;
  //     // }
  //     console.log('sender pubkey: ', payer.publicKey.toBase58());
  //     console.log('trying to send tx: ', tx.description);
  //     console.log('required signers: ', tx.transaction.signers?.map(s => s));
  //     const solanaTx = tx.transaction.transaction as Transaction;
  //     // solanaTx.feePayer = payer.publicKey;
  //     solanaTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  //     solanaTx.sign(...[...tx.transaction.signers ?? [], payer]);
  //     const serializedTx = solanaTx.serialize();
  //     console.log('serialized tx: ', serializedTx.toString('base64'));
  //     const txHash = await connection.sendRawTransaction(serializedTx);
  //     console.log("Transaction sent:", txHash);
  //     console.log('wait 60 seconds before sending next tx for safety')
  //     await new Promise(resolve => setTimeout(resolve, 60000));
  //   }
  // }

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
        pubkey: new PublicKey('7SjDJKhSd37aMDRQp44cawEYhjxZXrEVeN9hyMhZjtRy'),
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
            Uint8Array.from([0, 0, 0, 0, 0, 0, 0, 0])
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
