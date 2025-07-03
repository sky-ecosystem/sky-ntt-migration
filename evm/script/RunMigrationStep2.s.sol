// // SPDX-License-Identifier: Apache 2
pragma solidity >=0.8.8 <0.9.0;

import "forge-std/Script.sol";

import { MigrationInit } from "wh-lz-migration/deploy/MigrationInit.sol";

// forge script script/RunMigrationStep2.s.sol:RunMigrationStep2 --rpc-url="https://api.avax-test.network/ext/bc/C/rpc" \
//   --sig "run(address,bytes32,bytes32,address,bytes32,bytes32,uint48,uint256,address,bytes32,bytes32,bytes32,bytes32,bytes32,bytes32,address)" \
//   $OFT_ADAPTER $OFT_STORE $OFT_PROGRAM_ID $GOV_OAPP $NEW_GOV_PROGRAM_ID $NEW_MINT_AUTHORITY $WINDOW $LIMIT \
//   $NTT_MANAGER $NTT_PROGRAM_ID $NTT_CONFIG_PDA $NTT_TOKEN_AUTHORITY_PDA $USDS_MINT_ADDR $CUSTODY_ATA $GOV_PROGRAM_ID $OWNER -vvvvv --broadcast --via-ir
contract RunMigrationStep2 is Script {
    address wormhole = 0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C; // on Fuji
    address endpoint = 0x6EDCE65403992e310A62460808c4b910D972f10f; // on Fuji
    uint32 solEid = 40168; // devnet
    uint256 privKey = vm.envUint("EVM_PRIVATE_KEY");
   
    function run(
        address oftAdapter, 
        bytes32 oftStore, 
        bytes32 oftProgramId, 
        address govOapp,
        bytes32 newGovProgramId,
        bytes32 newMintAuthority,
        uint48  window,
        uint256 limit,
        address nttManager,
        bytes32 nttProgramId,
        bytes32 nttConfigPda,
        bytes32 nttTokenAuthorityPda,
        bytes32 usdsMintAddr,
        bytes32 custodyAta,
        bytes32 govProgramId,
        address owner
    ) public {
        vm.startBroadcast(privKey);

        MigrationInit.MigrationStep2Params memory p = MigrationInit.MigrationStep2Params({
            oftAdapter: oftAdapter,
            oftStore: oftStore,
            oftProgramId: oftProgramId,
            govOapp: govOapp,
            newGovProgramId: newGovProgramId,
            newMintAuthority: newMintAuthority,
            gasLimit: 1_000_000,
            outboundWindow: window,
            outboundLimit: limit,
            inboundWindow: window,
            inboundLimit: limit,
            rlAccountingType: 0,
            allowlistEnabled: false,
            nttManager: nttManager,
            nttProgramId: nttProgramId,
            nttConfigPda: nttConfigPda,
            nttTokenAuthorityPda: nttTokenAuthorityPda,
            usdsMintAddr: usdsMintAddr,
            custodyAta: custodyAta,
            govProgramId: govProgramId,
            wormhole: wormhole,
            owner: owner,
            endpoint: endpoint,
            solEid: solEid
        });

        MigrationInit.initMigrationStep2(p);

        vm.stopBroadcast();
    }
}