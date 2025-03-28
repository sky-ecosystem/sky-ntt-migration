import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import "dotenv/config";
import { NTT } from "../lib";
import { BN, Program } from "@coral-xyz/anchor";
import { IdlVersion, NttBindings, getNttProgram } from "../lib/bindings.js";
import bs58 from "bs58";
main();

async function main() {
    if (process.env.SOLANA_PRIVATE_KEY === undefined) {
        throw new Error("SOLANA_PRIVATE_KEY is not set");
    }

    const connection = new Connection("https://api.devnet.solana.com", "confirmed");

    const nttProgram = getNttProgram(
        connection,
        "LT7z3KBNJZRvJTprYGMWERSBFpwTdNqPzUnFPzYSgt3",
        "2.0.0" as IdlVersion
      );

    const key = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
    const payer = Keypair.fromSecretKey(key);
    const mint = new PublicKey('63YgAdH2VRXW3CWWLQG7uDLnYkQRZ6WTFRzq8tJ9fQBY');

    await transferMintAuthority(connection, nttProgram, payer, mint, new PublicKey('Fty7h4FYAN7z8yjqaJExMHXbUoJYMcRjWYmggSxLbHp8'));
}

// https://explorer.solana.com/tx/5URXJYNxFTEpUHcPTJ3VZekDvtkq5hc9SXto7DfozZYioSckuTHNn3JQarTkMqV22dTwgkWgF9ys4FcCLBhFJ8eW?cluster=devnet
async function initialize(connection: Connection, nttProgram: Program<NttBindings.NativeTokenTransfer<IdlVersion>>, payer: Keypair, mint: PublicKey, ) {
  const initializeIx = await NTT.createInitializeInstruction(nttProgram, {
    payer: payer.publicKey,
    owner: payer.publicKey,
    chain: "Solana",
    mint,
    outboundLimit: new BN(9999999999999),
    tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  });

  const transaction = new Transaction().add(initializeIx);
  transaction.feePayer = payer.publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  transaction.sign(payer);

  // const serializedTransactionAsBase64 = transaction.serialize().toString('base64');
  const txHash = await connection.sendRawTransaction(transaction.serialize());

  console.log('initialize', {
    txHash
  })

  return txHash;
}

// https://explorer.solana.com/tx/5WmfcW599MtiPvM5gA2o3obVRsisfHioaZwjuVvXuJXuQTje9sHr8VxVsznNPc4sPHa9fyMJ5jujs4vV4LENT91m?cluster=devnet
async function transferMintAuthority(connection: Connection, nttProgram: Program<NttBindings.NativeTokenTransfer<IdlVersion>>, payer: Keypair, mint: PublicKey, newMintAuthority: PublicKey) {
  const ix = await NTT.createTransferMintAuthorityInstruction(nttProgram, {
    payer: payer.publicKey,
    mint,
    newMintAuthority,
    tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  });

  const transaction = new Transaction().add(ix);
  transaction.feePayer = payer.publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  transaction.sign(payer);

  // const serializedTransactionAsBase64 = transaction.serialize().toString('base64');
  // console.log({
  //   serializedTransactionAsBase64
  // })

  const txHash = await connection.sendRawTransaction(transaction.serialize());

  console.log('initialize', {
    txHash
  })

  return txHash;
}