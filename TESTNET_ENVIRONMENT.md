## Deploy NTT

### Deploy EVM part

We will be using Avalanche Fuji as a testnet EVM. It has following Wormhole config:
```
{
    "description": "Avalanche testnet fuji",
    "chainId": 6,
    "tokenBridge": "0x61E44E506Ca5659E6c0bba9b678586fA2d729756",
    "wormholeRelayer": "0xA3cF45939bD6260bcFe3D66bc73d60f19e49a8BB",
    "wormhole": "0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C"
},
```

Deploy mock token:

```
cd evm
PRIVATE_KEY=123
forge script script/DeployDummyUsds.s.sol --rpc-url https://api.avax-test.network/ext/bc/C/rpc --private-key $PRIVATE_KEY --broadcast
```

Use deployed token address as `ETH_TOKEN_ADDR` in deploy-testnet.sh.

### Deploy Solana part

**Solana and Anchor**

Make sure to install correct versions:
```
sh -c "$(curl -sSfL https://release.anza.xyz/v1.18.10/install)"
cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked
cargo install solana-verify
```

**CLI**

Install CLI:
```
cd cli
bun install
./install.sh
```

To run CLI:
```
ntt
```

to work with NTT CLI.

You can exit CLI directory and go into Solana directory:
```
cd solana
```

Generate SPL token keypair:
```
solana-keygen new -o token-keypair.json
```

Prepare NTT keypair:
```
solana-keygen new -o target/deploy/ntt-keypair.json --force
```

Replace ID in NTT (native-token-transfers/lib.rs) with newly generated address:
```
#[cfg(feature = "token-usds")]
declare_id!("YOUR_NEW_ID");
```

Also update:
```
example_native_token_transfers = ID
```

in Anchor.toml with the new ID.

Update variables in deploy-testnet.sh.

Make sure Docker is running.

Run script (from root directory):
```
chmod +x scripts/deploy-testnet.sh
./scripts/deploy-testnet.sh
```
