// script based on https://github.com/wormhole-foundation/demo-ntt-ts-sdk/blob/main/src/resume.ts
import {
    TransactionId,
    Wormhole,
    amount,
    signSendWait,
} from "@wormhole-foundation/sdk";
import evm from "@wormhole-foundation/sdk/platforms/evm";
import solana from "@wormhole-foundation/sdk/platforms/solana";

// register protocol implementations
import "@wormhole-foundation/sdk-evm-ntt";
import "@wormhole-foundation/sdk-solana-ntt";

import deployment from '../../../deployment.json';
import { getSigner } from "./utils/helpers";

(async function () {
    const wh = new Wormhole("Testnet", [solana.Platform, evm.Platform], {
        // optional way to use private RPCs, especially recommended for mainnet 
        //   "chains": {
        //     "Avalanche": {
        //       "rpc": "http://127.0.0.1:8546"
        //     },
        //     "Solana": {
        //       "rpc": "http://127.0.0.1:8899"
        //     }
        //   }
    });

    const src = wh.getChain("Avalanche");
    const dst = wh.getChain("Solana");

    const srcSigner = await getSigner(src);
    const dstSigner = await getSigner(dst);

    const srcNtt = await src.getProtocol("Ntt", {
        ntt: {
            manager: deployment.chains[src.chain].manager,
            token: deployment.chains[src.chain].token,
            transceiver: {
                wormhole: deployment.chains[src.chain].transceivers.wormhole.address
            }
        },
    });
    const dstNtt = await dst.getProtocol("Ntt", {
        ntt: {
            manager: deployment.chains[dst.chain].manager,
            token: deployment.chains[dst.chain].token,
            transceiver: {
                wormhole: deployment.chains[dst.chain].transceivers.wormhole.address
            }
        },
    });

    //TODO: change to token amount that should be transferred
    const amt = amount.units(
        amount.parse("1.1", await srcNtt.getTokenDecimals())
    );

    const xfer = () =>
        srcNtt.transfer(srcSigner.address.address, amt, dstSigner.address, {
            queue: false,
            automatic: false,
            gasDropoff: 0n,
        });

    // Get calldata for simulation on tenderly (optional)
    const firstTx = await xfer().next();
    if (!firstTx.done) {
        const txData = firstTx.value.transaction.data;
        console.log("Transfer Calldata for EVM simulation:", txData);
    }

    // Initiate the transfer
    const txids: TransactionId[] = await signSendWait(src, xfer(), srcSigner.signer);
    console.log("Source txs", txids);

    const vaa = await wh.getVaa(
        txids[txids.length - 1]!.txid,
        "Ntt:WormholeTransfer",
        25 * 60 * 1000
    );
    console.log(vaa);

    const dstTxids = await signSendWait(
      dst,
      dstNtt.redeem([vaa!], dstSigner.address.address),
      dstSigner.signer
    );
    console.log("dstTxids", dstTxids);
})();