// // SPDX-License-Identifier: Apache 2
pragma solidity >=0.8.8 <0.9.0;

import "forge-std/Script.sol";

import { MigrationInit } from "wh-lz-migration/deploy/MigrationInit.sol";

// forge script script/RunMigrationStep1.s.sol:RunMigrationStep1 --rpc-url="https://api.avax-test.network/ext/bc/C/rpc" --sig "run(address,bytes32,bytes32,bytes32)" $NTT_MANAGER $NTT_PROGRAM_ID $NTT_CONFIG_PDA $GOV_PROGRAM_ID -vvvvv --broadcast
contract RunMigrationStep1 is Script {
    address wormhole = 0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C; // on Fuji
    uint256 privKey = vm.envUint("EVM_PRIVATE_KEY");
   
    function run(address nttManager, bytes32 nttProgramId, bytes32 nttConfigPda, bytes32 govProgramId) public {
        vm.startBroadcast(privKey);

        MigrationInit.MigrationStep1Params memory p = MigrationInit.MigrationStep1Params({
            nttManager:   nttManager,
            nttProgramId: nttProgramId,
            nttConfigPda: nttConfigPda,
            govProgramId: govProgramId,
            wormhole:     wormhole
        });

        MigrationInit.initMigrationStep1(p);

        vm.stopBroadcast();
    }
}