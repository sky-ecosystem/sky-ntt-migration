// SPDX-License-Identifier: Apache 2
pragma solidity >=0.8.8 <0.9.0;

import {console2, Script} from "forge-std/Script.sol";

import "../src/interfaces/INttManager.sol";
import "../src/interfaces/IManagerBase.sol";

import {NttManager} from "../src/NttManager/NttManager.sol";

contract DeployNewNTTImplementationScript is Script {
    struct DeploymentParams {
        address token;
        INttManager.Mode mode;
        uint16 wormholeChainId;
        uint64 rateLimitDuration;
        bool shouldSkipRatelimiter;
    }

    function run() public {
        DeploymentParams memory params = DeploymentParams({
            token: 0xdC035D45d973E3EC169d2276DDab16f1e407384F,
            mode: IManagerBase.Mode.LOCKING,
            wormholeChainId: 2,
            rateLimitDuration: 86400,
            shouldSkipRatelimiter: false
        });

        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);
        console2.log("Deployer: ", deployer);
        vm.startBroadcast(privateKey);

        NttManager implementation = new NttManager(
            params.token,
            params.mode,
            params.wormholeChainId,
            params.rateLimitDuration,
            params.shouldSkipRatelimiter
        );

        console2.log("NttManager Implementation deployed at: ", address(implementation));

        vm.stopBroadcast();
    }
}
