// SPDX-License-Identifier: Apache 2
pragma solidity >=0.8.8 <0.9.0;

import {Script, console} from "forge-std/Script.sol";
import {Usds} from "../src/mocks/Usds.sol";

contract DeployDummyUsds is Script {
    function run() public {
        vm.startBroadcast();
        Usds usds = new Usds();
        usds.initialize();
        console.log("Usds deployed at", address(usds));
        vm.stopBroadcast();
    }
}
