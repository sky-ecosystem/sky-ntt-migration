import "dotenv/config";
import {
  Connection,
  PublicKey
} from "@solana/web3.js";
import { UniversalAddress, amount, wormhole, WormholeMessageId, routes, TokenId, TransferState, Chain, Wormhole, deserialize, deserializeUnknownVaa, VAA, platformToAddressFormat } from "@wormhole-foundation/sdk";
import { derivePda } from "../lib/utils.js";
import { ethers } from "ethers";
import { abi } from './NTTManagerABI.js'
import { SolanaNtt } from "../sdk/ntt.js";
import evm from "@wormhole-foundation/sdk/evm";
import solana from "@wormhole-foundation/sdk/solana";
import { nttAutomaticRoute, nttManualRoute, NttRoute } from "../../../sdk/route/src/index.js";
import { getSigner } from "../../../cli/src/getSigner.js";
import { EvmNtt } from "../../../evm/ts/src/ntt.js";
import { SequenceTrackerLayout } from "./utils/layouts.js";

// register protocol implementations
import "../sdk"; // solana
import "../../../evm/ts/src/index"; // evm

const WORMHOLE_PROGRAM_ID = new PublicKey('worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth');
const WORMHOLE_CORE_BRIDGE_EVM_ADDRESS = '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B';
const NTT_PROGRAM_ID = new PublicKey('STTUVCMPuNbk21y1J6nqEGXSQ8HKvFmFBKnCvKHTrWn');
const NTT_MANAGER_EVM_ADDRESS = '0x7d4958454a3f520bDA8be764d06591B054B0bf33';
const NTT_EVM_TOKEN_ADDRESS = '0xdc035d45d973e3ec169d2276ddab16f1e407384f';
const NTT_TRANSCEIVER_EVM_ADDRESS = "0x16D2b6c87A18cB59DD59EFa3aa50055667cf481d";
const NTT_TRANSCEIVER_SOLANA_ADDRESS = '4ZQYCg7ZiVeNp9DxUbgc4b9JpLXoX1RXYfMXS5saXpkC'; // USDS Wormhole Transceiver
const NTT_SOLANA_TOKEN_ADDRESS = 'USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA';
const NTT_SOLANA_QUOTER_ADDRESS = 'Nqd6XqA8LbsCuG8MLWWuP865NV6jR1MbXeKxD4HLKDJ';
const TOKEN_SYMBOL = 'USDS';
const ENVIRONMENT = 'Mainnet' as const;
const CHAIN_EVM: Chain = 'Ethereum' as const;
const CHAIN_SOLANA: Chain = 'Solana' as const;
const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
const ETHEREUM_RPC_URL = 'https://0xrpc.io/eth';

const NttTokens: Record<string, NttRoute.TokenConfig[]> = {
  [TOKEN_SYMBOL]: [
    {
      chain: CHAIN_EVM,
      manager: NTT_MANAGER_EVM_ADDRESS,
      token: NTT_EVM_TOKEN_ADDRESS,
      transceiver: [
        {
          address: NTT_TRANSCEIVER_EVM_ADDRESS,
          type: "wormhole",
        },
      ],
    },
    {
      chain: CHAIN_SOLANA,
      manager: NTT_PROGRAM_ID.toBase58(),
      token: NTT_SOLANA_TOKEN_ADDRESS,
      transceiver: [
        {
          address: NTT_TRANSCEIVER_SOLANA_ADDRESS,
          type: "wormhole",
        },
      ],
      quoter: NTT_SOLANA_QUOTER_ADDRESS,
    },
  ]
}

type InflightCheckerContext = {
  evmNtt: EvmNtt<typeof ENVIRONMENT, "Ethereum">,
  evmToSolanaRoute: routes.Route<typeof ENVIRONMENT>,
  evmToSolanaRouteTransferRequest: routes.RouteTransferRequest<typeof ENVIRONMENT>,
  solanaNtt: SolanaNtt<typeof ENVIRONMENT, "Solana">,
  solanaToEvmRoute: routes.Route<typeof ENVIRONMENT>,
  solanaToEvmRouteTransferRequest: routes.RouteTransferRequest<typeof ENVIRONMENT>,
  wh: Wormhole<typeof ENVIRONMENT>,
}

const evmTokenId: TokenId = {
  chain: CHAIN_EVM,
  address: new UniversalAddress(NttTokens[TOKEN_SYMBOL]![0]!.token, platformToAddressFormat('Evm')),
}
const solanaTokenId: TokenId = {
  chain: CHAIN_SOLANA,
  address: new UniversalAddress(NttTokens[TOKEN_SYMBOL]![1]!.token, platformToAddressFormat('Solana')),
}

const connection = new Connection(SOLANA_RPC_URL, "confirmed");
const evmProvider = new ethers.JsonRpcProvider(ETHEREUM_RPC_URL);

const emitterPDA = derivePda(['emitter'], NTT_PROGRAM_ID);
const sequencePDA = derivePda(['Sequence', emitterPDA.toBytes()], WORMHOLE_PROGRAM_ID);

async function main() {
  const context = await createContext();

  // wait 10 seconds after the check so the public RPC can sustain the load
  await checkSolanaInbox(context, { delayAfterChecking: 10000 });

  console.log('--------------------------------');

  await checkSolanaOutbox(context);

  console.log('--------------------------------');

  await checkSolanaToEVMPathway(context, {
    numberOfMessagesToCheck: 10,
    skipFirst: 0,
    skipLast: 0,
  });

  console.log('--------------------------------');

  await checkEVMtoSolanaPathway(context, {
    numberOfMessagesToCheck: 10,
    skipFirst: 0,
    skipLast: 0,
    delayBetweenChecks: 500,
  });
}

async function checkSolanaInbox({ solanaNtt }: InflightCheckerContext, { delayAfterChecking }: { delayAfterChecking: number }) {
  console.log('[EVM->SOL]::[INBOX  ] Checking...');
  const inboxItems = await solanaNtt.program.account.inboxItem.all();
  const releasedItems = inboxItems.filter(item => item.account.releaseStatus.released);
  const unreleasedItemsLength = inboxItems.length - releasedItems.length;
  console.log(`[EVM->SOL]::[INBOX  ] Released items: ${releasedItems.length}`);
  console.log(`[EVM->SOL]::[INBOX  ] Unreleased items: ${unreleasedItemsLength}`);

  if (delayAfterChecking) {
    console.log(`[EVM->SOL]::[INBOX  ] Waiting ${delayAfterChecking}ms...`);
    await new Promise(resolve => setTimeout(resolve, delayAfterChecking));
  }
}

async function checkSolanaOutbox({ solanaNtt }: InflightCheckerContext) {
  console.log('[SOL->EVM]::[OUTBOX ] Checking...');
  const releasedItems = await solanaNtt.program.account.outboxItem.all([
    {
      memcmp: {
        offset: 123, // 8-byte discriminator + 115 bytes to reach 'released' field
        bytes: Buffer.from('01000000000000000000000000000000', 'hex').toString('base64'), // bitmap with first bit set to 1
        encoding: 'base64' as const,
      }
    }
  ]);
  const unreleasedItems = await solanaNtt.program.account.outboxItem.all([
    {
      memcmp: {
        offset: 123, // 8-byte discriminator + 115 bytes to reach 'released' field
        bytes: Buffer.from('00000000000000000000000000000000', 'hex').toString('base64'), // empty bitmap
        encoding: 'base64' as const,
      }
    }
  ]);

  console.log(`[SOL->EVM]::[OUTBOX ] Released items: ${releasedItems.length}`);
  console.log(`[SOL->EVM]::[OUTBOX ] Unreleased items: ${unreleasedItems.length}`);
}

async function checkSolanaToEVMPathway(context: InflightCheckerContext, { numberOfMessagesToCheck, skipFirst, skipLast }: { numberOfMessagesToCheck: number, skipFirst: number, skipLast: number }) {
  console.log(`[SOL->EVM]::[PATHWAY] Checking last ${numberOfMessagesToCheck} Solana to EVM transfers. Skip first: ${skipFirst}, skip last: ${skipLast}`);
  const sequenceInfo = await connection.getAccountInfo(sequencePDA);
  const lastUsedOutboundSequence: number = SequenceTrackerLayout.decode(sequenceInfo?.data).sequence.toNumber() - 1;

  console.log(`[SOL->EVM]::[PATHWAY] Last sent Solana to EVM sequence: #${lastUsedOutboundSequence} (0-indexed). Total messages: ${lastUsedOutboundSequence + 1}`);

 // message sequences start at 0, so we take the skipFirst - 1 to get the index of the first message to skip
 const firstIndexToSkip = skipFirst - 1;
  for (let i = 0; i < numberOfMessagesToCheck; i++) {
    const sequenceToCheck = lastUsedOutboundSequence - i - skipLast;
    if (sequenceToCheck === firstIndexToSkip || sequenceToCheck < 0) {
      break;
    }
    await checkSolanaToEVMTransfer(sequenceToCheck, context);
  }
}

async function checkSolanaToEVMTransfer(sequence: number, { solanaToEvmRoute, solanaToEvmRouteTransferRequest, evmNtt, wh }: InflightCheckerContext) {
  const seqStr = `#${sequence}`.padEnd(7);

  const wormholeMessageId: WormholeMessageId = {
    chain: 'Solana' as const,
    emitter: new UniversalAddress(NTT_TRANSCEIVER_SOLANA_ADDRESS, platformToAddressFormat('Solana')),
    sequence: BigInt(sequence),
  };

  const vaa = await obtainVaa(wormholeMessageId, wh, `[SOL->EVM]::[${seqStr}]`);

  if (!vaa) {
    return;
  }

  const tokenAmount = amount.fromBaseUnits(
    BigInt(vaa?.payload.nttManagerPayload.payload.trimmedAmount.amount.toString()!),
    vaa?.payload.nttManagerPayload.payload.trimmedAmount.decimals!
  );

  let isExecuted = await evmNtt.getIsExecuted(vaa!);

  const amountStr = `${amount.display(tokenAmount)} ${TOKEN_SYMBOL}`.padStart(25);
  const statusStr = isExecuted ? 'Executed' : 'Not executed';
  
  console.log(`[SOL->EVM]::[${seqStr}] Amount: ${amountStr} | Status: ${statusStr}`);

  if (!isExecuted) {
    console.log(`[SOL->EVM]::[${seqStr}] Transfer details:`, {
      time: new Date((vaa?.timestamp ?? 0) * 1000).toISOString(),
      sender: (vaa?.payload.nttManagerPayload.sender.toNative(CHAIN_SOLANA).address as PublicKey).toBase58(),
      recipient: vaa?.payload.nttManagerPayload.payload.recipientAddress.toNative(CHAIN_EVM).address,
    })

    console.log(`[SOL->EVM]::[${seqStr}] Checking and completing transfer...`);
    const validatedParams = await solanaToEvmRoute.validate(solanaToEvmRouteTransferRequest, {
      amount: amount.display(tokenAmount),
      options: { automatic: false },
    });
    const manualTransferReceipt: NttRoute.ManualTransferReceipt = {
      from: CHAIN_SOLANA,
      to: CHAIN_EVM,
      state: TransferState.Attested,
      originTxs: [],
      attestation: {
        id: wormholeMessageId,
        attestation: vaa!,
      },
      params: {
        amount: amount.display(tokenAmount),
        options: { automatic: false },
        normalizedParams: (validatedParams.params as any).normalizedParams,
      }
    }
    const dstSigner = await getSigner(
      wh.getChain("Ethereum"),
      "privateKey",
    );

    await routes.checkAndCompleteTransfer(solanaToEvmRoute, manualTransferReceipt, dstSigner.signer, 1000);

    console.log(`[SOL->EVM]::[${seqStr}] Waiting 60 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 60000));

    isExecuted = await evmNtt.getIsExecuted(vaa!);

    if (isExecuted) {
      console.log(`[SOL->EVM]::[${seqStr}] Transfer executed successfully`);
    } else {
      throw new Error(`[SOL->EVM]::[${seqStr}] Transfer failed to execute`);
    }
  }
}

async function checkEVMtoSolanaPathway(context: InflightCheckerContext, { numberOfMessagesToCheck, skipFirst, skipLast, delayBetweenChecks }: { numberOfMessagesToCheck: number, skipFirst: number, skipLast: number, delayBetweenChecks: number }) {
  console.log(`[EVM->SOL]::[PATHWAY] Checking last ${numberOfMessagesToCheck} EVM to Solana transfers. Skip first: ${skipFirst}, skip last: ${skipLast}. Delay between checks: ${delayBetweenChecks}ms`);

  const nttManagerEVM = new ethers.Contract(NTT_MANAGER_EVM_ADDRESS, abi, evmProvider);
  
  // msgSequence is 2 less than sequence on mainnet because first two messages are configuration messages
  const nextSequence = await (nttManagerEVM as any).nextMessageSequence() + 2n;
  const lastSentSequence = nextSequence - 1n;

  console.log(`[EVM->SOL]::[PATHWAY] Last sent EVM to Solana sequence: #${lastSentSequence} (0-indexed). Total messages: ${lastSentSequence + BigInt(1)}`);

  // message sequences start at 0, so we take the skipFirst - 1 to get the index of the first message to skip
  const firstIndexToSkip = skipFirst - 1;
  for (let i = 0; i < numberOfMessagesToCheck; i++) {
    const sequenceToCheck = Number(lastSentSequence) - i - skipLast;
    if (sequenceToCheck === firstIndexToSkip || sequenceToCheck < 0) {
      break;
    }
    await checkEVMtoSolanaTransfer(sequenceToCheck, context);
    if (delayBetweenChecks) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenChecks));
    }
  }
}

async function checkEVMtoSolanaTransfer(sequence: number, { wh, evmToSolanaRoute, evmToSolanaRouteTransferRequest, solanaNtt }: InflightCheckerContext) {
  const seqStr = `#${sequence}`.padEnd(7);

  const wormholeMessageId: WormholeMessageId = {
    chain: 'Ethereum' as const,
    emitter: new UniversalAddress(NTT_TRANSCEIVER_EVM_ADDRESS),
    sequence: BigInt(sequence),
  };

  const vaa = await obtainVaa(wormholeMessageId, wh, `[EVM->SOL]::[${seqStr}]`);

  if (!vaa) {
    return;
  }

  const tokenAmount = amount.fromBaseUnits(
    BigInt(vaa?.payload.nttManagerPayload.payload.trimmedAmount.amount.toString()!),
    vaa?.payload.nttManagerPayload.payload.trimmedAmount.decimals!
  );

  let isExecuted = await solanaNtt.getIsExecuted(vaa!);

  const amountStr = `${amount.display(tokenAmount)} ${TOKEN_SYMBOL}`.padStart(25);
  const statusStr = isExecuted ? 'Executed' : 'Not executed';
  
  console.log(`[EVM->SOL]::[${seqStr}] Amount: ${amountStr} | Status: ${statusStr}`);

  if (!isExecuted) {
    console.log(`[EVM->SOL]::[${seqStr}] Transfer details:`, {
      time: new Date((vaa?.timestamp ?? 0) * 1000).toISOString(),
      sender: (vaa?.payload.nttManagerPayload.sender.toNative(CHAIN_SOLANA).address as PublicKey).toBase58(),
      recipient: vaa?.payload.nttManagerPayload.payload.recipientAddress.toNative(CHAIN_EVM).address,
    })

    console.log(`[EVM->SOL]::[${seqStr}] Checking and completing transfer...`);
    const validatedParams = await evmToSolanaRoute.validate(evmToSolanaRouteTransferRequest, {
      amount: amount.display(tokenAmount),
      options: { automatic: false },
    });
    const manualTransferReceipt: NttRoute.ManualTransferReceipt = {
      from: CHAIN_EVM,
      to: CHAIN_SOLANA,
      state: TransferState.Attested,
      originTxs: [],
      attestation: {
        id: wormholeMessageId,
        attestation: vaa!,
      },
      params: {
        amount: amount.display(tokenAmount),
        options: { automatic: false },
        normalizedParams: (validatedParams.params as any).normalizedParams,
      }
    }
    const dstSigner = await getSigner(
      wh.getChain("Solana"),
      "privateKey",
    );

    await routes.checkAndCompleteTransfer(evmToSolanaRoute, manualTransferReceipt, dstSigner.signer, 1000);

    console.log(`[EVM->SOL]::[${seqStr}] Waiting 60 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 60000));

    isExecuted = await solanaNtt.getIsExecuted(vaa!);

    if (isExecuted) {
      console.log(`[EVM->SOL]::[${seqStr}] Transfer executed successfully`);
    } else {
      throw new Error(`[EVM->SOL]::[${seqStr}] Transfer failed to execute`);
    }
  }
}

async function createContext(): Promise<InflightCheckerContext> {
  const wh = await wormhole(ENVIRONMENT, [evm, solana], {
    chains: {
      Ethereum: { rpc: ETHEREUM_RPC_URL },
      Solana: { rpc: SOLANA_RPC_URL },
    }
  });

  const evmNtt = new EvmNtt(ENVIRONMENT, "Ethereum", evmProvider, {
    ntt: {
      manager: NTT_MANAGER_EVM_ADDRESS,
      token: NTT_EVM_TOKEN_ADDRESS,
      transceiver: { wormhole: NTT_TRANSCEIVER_EVM_ADDRESS },
    },
    coreBridge: WORMHOLE_CORE_BRIDGE_EVM_ADDRESS,
  });

  const solanaNtt = new SolanaNtt(ENVIRONMENT, "Solana", connection, {
    ntt: {
      manager: NTT_PROGRAM_ID.toBase58(),
      token: NTT_SOLANA_TOKEN_ADDRESS,
      transceiver: { wormhole: NTT_TRANSCEIVER_SOLANA_ADDRESS },
      quoter: NTT_SOLANA_QUOTER_ADDRESS,
    },
    coreBridge: WORMHOLE_PROGRAM_ID.toBase58(),
  });

  const evmToSolanaRouteTransferRequest = await routes.RouteTransferRequest.create(wh, {
    source: evmTokenId,
    destination: solanaTokenId,
  });

  const solanaToEvmRouteTransferRequest = await routes.RouteTransferRequest.create(wh, {
    source: solanaTokenId,
    destination: evmTokenId,
  });

  const resolver = wh.resolver([
    nttManualRoute({ tokens: NttTokens }),
    nttAutomaticRoute({ tokens: NttTokens }),
  ]);

  return {
    evmNtt,
    evmToSolanaRoute: (await resolver.findRoutes(evmToSolanaRouteTransferRequest))[0]!,
    evmToSolanaRouteTransferRequest,
    solanaNtt,
    solanaToEvmRoute: (await resolver.findRoutes(solanaToEvmRouteTransferRequest))[0]!,
    solanaToEvmRouteTransferRequest,
    wh,
  }
}

async function obtainVaa(wormholeMessageId: WormholeMessageId, wh: Wormhole<typeof ENVIRONMENT>, logPrefix: string): Promise<VAA<"Ntt:WormholeTransfer"> | null> {
  const vaaBytes = await wh.getVaaBytes(
    wormholeMessageId,
    10 * 1000
  );
  const payload = deserializeUnknownVaa(vaaBytes!).payload;
  if (payload[0] === 156 && payload[1] === 35 && payload[2] === 189 && payload[3] === 59) {
    console.log(`${logPrefix} Ntt:TransceiverInfo               | Status: Skipped`);
    return null;
  } else if (payload[0] === 24 && payload[1] === 252 && payload[2] === 103 && payload[3] === 194) {
    console.log(`${logPrefix} Ntt:TransceiverRegistration       | Status: Skipped`);
    return null;
  }

  return deserialize('Ntt:WormholeTransfer', vaaBytes!);
}

main()
