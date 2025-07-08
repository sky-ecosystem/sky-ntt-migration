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

In `solana/programs/wormhole-governance/src/lib.rs:10`, override the `GOV_AUTHORITY` constant with the EVM address of the emitter account (the address must be left-padded to 32 bytes).

## Build

In Solana directory:

```
make build
```

Then run 

```bash
anchor keys sync
anchor build
```

to update the ID declarations and re-build the programs.

## Deploy

In Solana directory:

```
solana program deploy --program-id target/deploy/wormhole_governance-keypair.json target/deploy/wormhole_governance.so -u devnet
```

## Send message from EVM

In EVM directory:
```
cd evm
```

Download the solidity contracts with

```
forge install
```

Send message from EVM:

```
forge script script/SendGovernanceMessage.s.sol --sig "run(address,uint8,bytes,uint32)" --rpc-url="RPC_URL" WORMHOLE_BRIDGE_ADDRESS CONSISTENCY_LEVEL GOVERNANCE_MSG NONCE --private-key $EVM_PRIVATE_KEY --broadcast
```

Make sure the `GOVERNANCE_MSG` contains the (previously deployed) Wormhole governance program ID. To generate a valid message, run the following command from `evm` directory (it requires the `base58` python module, which can be installed with `pip install base58`)

```bash
GOVERNANCE_PROGRAM_ID=$(solana-keygen pubkey ../solana/target/deploy/wormhole_governance-keypair.json)
python3 utils/encode_governance_msg.py $GOVERNANCE_PROGRAM_ID
```

This will output a governance message (as a hex string) that includes the given governance program ID (derived from `solana/target/deploy/wormhole_governance-keypair.json`), which can be used as an argument to the `script/SendGovernanceMessage.s.sol` script.

Example send from Fuji:
```
forge script script/SendGovernanceMessage.s.sol --sig "run(address,uint8,bytes,uint32)" --rpc-url="https://api.avax-test.network/ext/bc/C/rpc" 0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C 12 000000000000000047656e6572616c507572706f7365476f7665726e616e63650200014bf5b8fd7d5eed1396128c065162ca0fd5604e3487ac51cb868c05c12c51aeb52c43318f0f99dfd8c0ebc65b0b23cc661fcd1df64af6aef33b7b83eca8e5819700000008afaf6d1f0d989bed 1 --private-key $EVM_PRIVATE_KEY --broadcast
```

You will get sent transaction hash such as:
```
0x2e622913e0321a4ec75058f4e1709752073b56c5f29bd5c6e6180bb4cfa19ace
```

Go to Wormhole Scan and find the transaction there, eg.:

https://wormholescan.io/#/tx/0x2e622913e0321a4ec75058f4e1709752073b56c5f29bd5c6e6180bb4cfa19ace?network=Testnet

If you see transaction in Wormhole Scan it means you have sent the transaction correctly.

## Receive message on Solana

Set the SOLANA_PRIVATE_KEY of payer wallet on Solana. It needs to have SOL balance to pay for gas fees.

In the root directory of the project run:

```
bun solana/ts/scripts/postVaa.ts YOUR_SENT_TRANSACTION_HASH_ON_SOURCE_CHAIN
```

Example:
```
$ bun solana/ts/scripts/postVaa.ts 0xf4c05ea46146b60e0fcd6ac1d26a0c40de885efe8d6ed326f4bc37e0ace88fe4

Retrying Wormholescan:GetVaaByTxHash, attempt 0/750 
...
Sending transaction:  Core.VerifySignature
serialized tx:  AhPq2yJHhfqpGDmTLw39My0w09ad694DUo0h7FYZu2r5CKaEc9v1Cf1Ir8HkUYoekenJDyvvbtrKuJIckrQWTQaOxlCp3nGMCkUkDEMOPFyZ2XriUvXN07O46iO14YRqSnM8splrKNvlh3hvipIUdU2FC57BNzcFGvXqRBOY/uACAgAGCN1TsCUhMjYpGbxA9IO+AjzWlnvemDrizcLd+q1mwGyNfmSRL88IvcrNPFT60NDlXI3IusNFsxgANd6xY5wkexwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACsSRsnu+jxGZ5IlMRHzX+we6O5enevEEtLpra3+zcxyCXe9N85vGkMfmNYmM/l5TqsWcDGkop+8Z932lKzYVMcExvwg8FDM8FWE1yEcn4z1nsFHhbsWah4oMOgSIAAAAAan1RcYe9FmNdrUBFX9wsDBJMaPIVZ1pdu6y18IAAAABqfVFxksXFEhjMlMPUrxf1ja7gibof1E49vZigAAAABGKjA3h28JNyXMq+a6cTd/IoQz44oaw72Ad/H8IRR5cgIFAIEBAQwAAE0AAGEAIAAAQk7y3A3o6mPDD2lg9RIo47kTTzALGP/EvMkGOC3/TG59sAT5iLBJTMo7zI0bl6a/VNDd7TKN5opYyjW2AEz8vQETlHvUixjlP9ru5380czkaxyfGOHBfCpehnTBrOks9Rz0Jt1HHHQGJNRUNsvIOVQQ5XsYLAwYABAEGBwIUBwD///////////////////////8=
Transaction sent: Q6b5wDh43y6XNCjbCbirqjyMzLKumXRH75N5ENQWKMKQAkbSYgPYvC7w4MRdzkdKsrdcmEVKvnx7vzAH7MNjGTf
wait 30 seconds for finality before sending next tx


Sending transaction:  Core.PostVAA
serialized tx:  Ae3xgQls2P7I+X3SdZ4cuBPLkBlcQZ2DA5J351i/L6J/Jus8rj7Z+psWtsmXm2OKWvwQjBe67kRzyN0jmB84KQ0BAAcJ3VOwJSEyNikZvED0g74CPNaWe96YOuLNwt36rWbAbI07HEIQ7sdEevMUrc0QDiVzizoFuYSHuC47P/7RaPtamgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKxJGye76PEZnkiUxEfNf7B7o7l6d68QS0umtrf7NzHJTLprzTXUewJfmUzl+lrX7S2xsuEFhbBYGqovgqvcOyn5kkS/PCL3KzTxU+tDQ5VyNyLrDRbMYADXesWOcJHscCXe9N85vGkMfmNYmM/l5TqsWcDGkop+8Z932lKzYVMcGp9UXGMd0yShWY5hpHV62i164o5tLbVxzVVshAAAAAAan1RcZLFxRIYzJTD1K8X9Y2u4Im6H9ROPb2YoAAAAAXAR2wGFsCf1uFlrcN58iwJczyOBMpyYSWcCm9M67fswBAwgGBAUBAAcIAqwBAgEAAAAAUFRlaAEAAAAGAAAAAAAAAAAAAAAAAAgEpuJ5j0LH88lyFd35WNVQD47IBwAAAAAAAAAMbwAAAAAAAAAAAAAAR2VuZXJhbFB1cnBvc2VHb3Zlcm5hbmNlAgABS/W4/X1e7ROWEowGUWLKD9VgTjSHrFHLhowFwSxRrrUsQzGPD5nf2MDrxlsLI8xmH80d9kr2rvM7e4PsqOWBlwAAAAivr20fDZib7Q==
Transaction sent: 5kvPbn179dnp1kTYDEghXiG85od6LmhRRWgAsS94om1vYxp5gDgLQQh5jSbiNWjJKCaLm7iUq5bCzbLTFby1HnyA
wait 30 seconds for finality before sending next tx


Posted VAA address:  4yk3euBt2SLPw5BPswtJmuw17vAsNyARz8pbRwJ8DAT3
Delivering governance message...
Serialized tx:  AQdTiUDxKJIGYXjG5E9aw+sDZ0gpJlSeAhHuttcgWI0zorNGmrmcdEfkH416zJmu0mcZnkYG9DuVQ8LCIYKKtwUBAAMH3VOwJSEyNikZvED0g74CPNaWe96YOuLNwt36rWbAbI0cCn5rwJasFtq3u9L8i0Sp3BUZXeFpPloIFbUjWjtcHyxDMY8Pmd/YwOvGWwsjzGYfzR32Svau8zt7g+yo5YGXq0o+Ft2L/V2Dcg4t27foh2YaJlT4VtQr4JXm2rfnPUYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADscQhDux0R68xStzRAOJXOLOgW5hIe4Ljs//tFo+1qaS/W4/X1e7ROWEowGUWLKD9VgTjSHrFHLhowFwSxRrrUEXC8DSGHpbKq42iBYpOdds5fXMeB8gmh+Sr9VmIoxpgEGBgADBQIBBAgL98u9UmEpVA==
Governance message delivery transaction sent: 9VkKKewQFHj1YNX8PyLA4Pag8BLJ9MGiB462WY5fx4ws42JrhE4hzN9DzFcSrtFmY8J4MSmLfPMMjp7CJM3bddW
```

You can copy the last transaction hash received from "Transaction sent:" log and paste it in the Solana explorer to double check it has been successfully executed: https://explorer.solana.com/?cluster=devnet
