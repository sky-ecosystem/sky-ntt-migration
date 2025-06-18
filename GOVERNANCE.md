# Governance

## Preparation

Make sure to set default features in `solana/programs/wormhole-governance/Cargo.toml` to either "mainnet" or "solana-devnet" depending on the Solana network you will deploy governance program to.

For example for Solana Devnet entry should look like this:
```
[features]
default = ["solana-devnet"]
```

In `solana/programs/wormhole-governance/src/instructions/governance.rs` make sure to set the constraint:
```
constraint = vaa.emitter_chain() == Into::<u16>::into(Chain::Ethereum) @ GovernanceError::InvalidGovernanceChain,
```

to the specific Chain that you are sending messages from. For example for Avalanche that would be:
```
constraint = vaa.emitter_chain() == Into::<u16>::into(Chain::Avalanche) @ GovernanceError::InvalidGovernanceChain,
```

## Build

In Solana directory:

```
make build
```

## Deploy

In Solana directory:

```
solana program deploy --program-id target/deploy/wormhole_governance-keypair.json target/deploy/wormhole_governance.so -u devnet
```

## Send message from EVM

Send message from EVM:

```
forge script script/SendGovernanceMessage.s.sol --sig "run(address,uint8,bytes)" --rpc-url="RPC_URL" WORMHOLE_BRIDGE_ADDRESS CONSISTENCY_LEVEL GOVERNANCE_MSG --private-key $EVM_PRIVATE_KEY --broadcast
```

Example send from Fuji:
```
forge script script/SendGovernanceMessage.s.sol --sig "run(address,uint8,bytes)" --rpc-url="https://api.avax-test.network/ext/bc/C/rpc" 0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C 12 000000000000000047656e6572616c507572706f7365476f7665726e616e63650200014bf5b8fd7d5eed1396128c065162ca0fd5604e3487ac51cb868c05c12c51aeb52c43318f0f99dfd8c0ebc65b0b23cc661fcd1df64af6aef33b7b83eca8e5819700000008afaf6d1f0d989bed --private-key $EVM_PRIVATE_KEY --broadcast
```

You will get sent transaction hash such as:
```
0x2e622913e0321a4ec75058f4e1709752073b56c5f29bd5c6e6180bb4cfa19ace
```

Go to Wormhole Scan and find the transaction there, eg.:

https://wormholescan.io/#/tx/0x2e622913e0321a4ec75058f4e1709752073b56c5f29bd5c6e6180bb4cfa19ace?network=Testnet