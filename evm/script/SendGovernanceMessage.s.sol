// SPDX-License-Identifier: Apache 2
pragma solidity >=0.8.8 <0.9.0;

import {Script, console} from "forge-std/Script.sol";

import {IWormhole} from "../lib/wormhole-solidity-sdk/src/interfaces/IWormhole.sol";

contract SendGovernanceMessageScript is Script {
    IWormhole public immutable wormhole = IWormhole(0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C);

    function run(bytes memory payload) public {
        vm.broadcast();
        uint64 sequence = wormhole.publishMessage(1, payload, 12);
        console.log("Sequence:", sequence);
    }
}