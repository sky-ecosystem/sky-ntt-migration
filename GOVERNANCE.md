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

In EVM directory:
```
cd evm
```

Send message from EVM:

```
forge script script/SendGovernanceMessage.s.sol --sig "run(address,uint8,bytes,uint32)" --rpc-url="RPC_URL" WORMHOLE_BRIDGE_ADDRESS CONSISTENCY_LEVEL GOVERNANCE_MSG NONCE --private-key $EVM_PRIVATE_KEY --broadcast
```

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

First, replace `GOVERNANCE_PROGRAM_ID` with the correct value (eg. to the address where you deployed it) in `solana/ts/scripts/postVaa.ts` script.

Now set the SOLANA_PRIVATE_KEY of payer wallet on Solana. It needs to have SOL balance to pay for gas fees.

In the root directory of the project run:

```
bun solana/ts/scripts/postVaa.ts YOUR_SENT_TRANSACTION_HASH_ON_SOURCE_CHAIN
```

Example:
```
$ bun solana/ts/scripts/postVaa.ts 0x80834445d79dd87be929c426c7da128eba90c8e564b43e0fb6092cdf76cb015d

// Output
{
  protocolName: "GeneralPurposeGovernance",
  payloadName: "GeneralPurposeSolana",
  payloadLiteral: "GeneralPurposeGovernance:GeneralPurposeSolana",
 ...
trying to send tx:  Core.VerifySignature
serialized tx:  Aj0WrbREKeYXe4Fafc3jyRDg5ItUO/SjtBMkRN53soSn0zsLsaVwamyWrWF9JtZKSTcMBaFU3x7a2QPecWt/kg0Z8CUsR86HOEiql4BuwuSaiM/7yzN6bf05ApEbq3G+X/MaQ1BA0NvMbvK2p7/GqGp5KuXqGz7Q6BE7A8PbTYMIAgAGCN1TsCUhMjYpGbxA9IO+AjzWlnvemDrizcLd+q1mwGyNXYSh+/6VtcgvluYoSJo5ICkGzFoMijkKjN0TYdwoSfIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACsSRsnu+jxGZ5IlMRHzX+we6O5enevEEtLpra3+zcxyCXe9N85vGkMfmNYmM/l5TqsWcDGkop+8Z932lKzYVMcExvwg8FDM8FWE1yEcn4z1nsFHhbsWah4oMOgSIAAAAAan1RcYe9FmNdrUBFX9wsDBJMaPIVZ1pdu6y18IAAAABqfVFxksXFEhjMlMPUrxf1ja7gibof1E49vZigAAAAA9foPy8zHSgbDQfb2ERBJssOlrbuLlcrAoOvIqdoj/fQIFAIEBAQwAAE0AAGEAIAAA6rq1lRmbm3h8Kd+DSRsxMSAZXIYkfg8a7HaXopQ2uTMVsFgP2NxH0m+pUjs1sFGrBRyfH6sZ6/j4B3yyIJDp2gETlHvUixjlP9ru5380czkaxyfGOIP+JgHVaoD6XGD1HhkiNq1HnQMC8sYO9S4FN0PPIGmVAwYABAEGBwIUBwD///////////////////////8=
Transaction sent: 2DqeKPEAAMt7s1fvvt8mHY1CMHKvKAySfrwj6xxp2nu6ipgHH655Q2MsMrfhvmw8a72ERjnKgKnpxo1Zu93mJExU
wait 30 seconds for finality before sending next tx
sender pubkey:  Fty7h4FYAN7z8yjqaJExMHXbUoJYMcRjWYmggSxLbHp8
trying to send tx:  Core.PostVAA
required signers:  undefined
serialized tx:  ATi84OYgdtU267kiFi58qPdTsL2P3RWfdB7WxcQdPRATWKaI6fq98cihOwIk1TkLHmJX0lzBLNamvA/g0y0X6w0BAAcJ3VOwJSEyNikZvED0g74CPNaWe96YOuLNwt36rWbAbI3jL0EDdHHxB3fhUheoxc6ZxBODxvuHsdaIhGadIMd5wgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKxJGye76PEZnkiUxEfNf7B7o7l6d68QS0umtrf7NzHJTLprzTXUewJfmUzl+lrX7S2xsuEFhbBYGqovgqvcOyl2Eofv+lbXIL5bmKEiaOSApBsxaDIo5CozdE2HcKEnyCXe9N85vGkMfmNYmM/l5TqsWcDGkop+8Z932lKzYVMcGp9UXGMd0yShWY5hpHV62i164o5tLbVxzVVshAAAAAAan1RcZLFxRIYzJTD1K8X9Y2u4Im6H9ROPb2YoAAAAARCNUAFtPvYryO+Kci94a7RrugYqHUSrmZeE8O5NLhycBAwgGBAUBAAcIAqwBAgEAAAAALxtlaAEAAAAGAAAAAAAAAAAAAAAAAAgEpuJ5j0LH88lyFd35WNVQD47IBQAAAAAAAAAMbwAAAAAAAAAAAAAAR2VuZXJhbFB1cnBvc2VHb3Zlcm5hbmNlAgABS/W4/X1e7ROWEowGUWLKD9VgTjSHrFHLhowFwSxRrrUsQzGPD5nf2MDrxlsLI8xmH80d9kr2rvM7e4PsqOWBlwAAAAivr20fDZib7Q==
Transaction sent: 28o2J3s6Z3pkiGfh9b9nxfZVDvnNWTTdBF2BeggyvLxq9hezvTJpGBKSgFuuo9BrFNFjgfxBg9HUcNAteB9ZWts6
wait 30 seconds for finality before sending next tx
posted VAA address:  GHqLfWLmKUA8scJ2Qz1bgCs2k1VT24nBaZVJDvTspua1
serialized tx:  ATS3ODRO3aEMhC6d69QH0Q55M7uDV8vMN7WP6IT1L12dvWOBM9mD25SqB5pDwxswr9F6GuyXmZ59Fy0RfXiDeA4BAAMH3VOwJSEyNikZvED0g74CPNaWe96YOuLNwt36rWbAbI0sQzGPD5nf2MDrxlsLI8xmH80d9kr2rvM7e4PsqOWBlzyTCQxCykuMEnP+WS1SibOzeEhmNvDCoVUTRUOLk1T2q0o+Ft2L/V2Dcg4t27foh2YaJlT4VtQr4JXm2rfnPUYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEv1uP19Xu0TlhKMBlFiyg/VYE40h6xRy4aMBcEsUa614y9BA3Rx8Qd34VIXqMXOmcQTg8b7h7HWiIRmnSDHecLvmiOx5S8zTw2vEGvQs1B0Wo7JlayybW09dvnbS+egYgEFBgADBgECBAgL98u9UmEpVA==
Transaction sent: 248WQeaqA3E4B5rwV9UBMYkM7aFVqFy68fJ83E6qfRKN1D4i1CPpHjgYYspbojvSVfp3ZQ4RQNrBs14XvsEpXw8Z
done
```

You can copy the last transaction hash received from "Transaction sent:" log and paste it in the Solana explorer to double check it has been successfully executed: https://explorer.solana.com/?cluster=devnet