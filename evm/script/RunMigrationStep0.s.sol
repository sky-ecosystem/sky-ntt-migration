// // SPDX-License-Identifier: Apache 2
pragma solidity >=0.8.8 <0.9.0;

import "forge-std/Script.sol";

import { IManagerBase, NttManager } from "../src/NttManager/NttManager.sol";
import { MigrationInit } from "wh-lz-migration/deploy/MigrationInit.sol";

// forge script script/RunMigrationStep0.s.sol:RunMigrationStep0 --rpc-url="https://api.avax-test.network/ext/bc/C/rpc" --sig "run(address,bytes32,bytes32,bytes32,bytes32)" $NTT_MANAGER $NTT_MANAGER_IMP_V2_SOL_BUFFER $NTT_PROGRAM_ID $NTT_PROGRAM_DATA_ADDR $GOV_PROGRAM_PDA -vvvvv --broadcast
contract RunMigrationStep0 is Script {
    address wormhole = 0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C; // on Fuji
    uint256 privKey = vm.envUint("EVM_PRIVATE_KEY");

    function deployNewFujiNttImplementation(address token) internal returns (address nttManagerImpV2) {
        nttManagerImpV2 = address(new NttManager({ 
            _token: token,
            _mode: IManagerBase.Mode.LOCKING,
            _chainId: 6, // Fuji
            _rateLimitDuration: 86400,
            _skipRateLimiting: false
        }));
    }
   
    function run(address nttManager, bytes32 nttManagerImpV2SolBuffer, bytes32 nttProgramId, bytes32 nttProgramDataAddr, bytes32 govProgramId) public {
        vm.startBroadcast(privKey);

        address nttManagerImpV2 = deployNewFujiNttImplementation(IManagerBase(nttManager).token());
        console2.log("NttManagerImpV2:", nttManagerImpV2);

        MigrationInit.MigrationStep0Params memory p = MigrationInit.MigrationStep0Params({
            nttManagerImpV2:          nttManagerImpV2,
            nttManagerImpV2SolBuffer: nttManagerImpV2SolBuffer,
            nttManager:               nttManager,
            nttProgramDataAddr:       nttProgramDataAddr,
            nttProgramId:             nttProgramId,
            govProgramId:             govProgramId,
            wormhole:                 wormhole
        });

        MigrationInit.initMigrationStep0(p);

        vm.stopBroadcast();
    }
}