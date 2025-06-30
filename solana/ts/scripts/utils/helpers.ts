import {
  Chain,
  ChainAddress,
  ChainContext,
  Network,
  Signer,
  Wormhole,
  chainToPlatform,

} from "@wormhole-foundation/sdk";

import evm from "@wormhole-foundation/sdk/platforms/evm";
import solana from "@wormhole-foundation/sdk/platforms/solana";

export interface SignerStuff<N extends Network, C extends Chain> {
  chain: ChainContext<N, C>;
  signer: Signer<N, C>;
  address: ChainAddress<C>;
}

export async function getSigner<N extends Network, C extends Chain>(
  chain: ChainContext<N, C>
): Promise<SignerStuff<N, C>> {
  let signer: Signer;
  const platform = chainToPlatform(chain.chain);
  switch (platform) {
    case "Solana":
      signer = await solana.getSigner(
        await chain.getRpc(),
        getEnv("SOLANA_PRIVATE_KEY"),
        { debug: false }
      );
      break;
    case "Evm":
      signer = await evm.getSigner(
        await chain.getRpc(),
        getEnv("ETH_PRIVATE_KEY")
      );
      break;
    default:
      throw new Error("Unrecognized platform: " + platform);
  }

  return {
    chain,
    signer: signer as Signer<N, C>,
    address: Wormhole.chainAddress(chain.chain, signer.address()),
  };
}

function getEnv(key: string, dev?: string): string {
  // If we're in the browser, return empty string
  if (typeof process === undefined) return "";
  // Otherwise, return the env var or error
  const val = process.env[key];
  if (!val) {
    if (dev) return dev;
    throw new Error(
      `Missing env var ${key}, did you forget to set values in '.env'?`
    );
  }

  return val;
}