// SPDX-License-Identifier: Apache 2
pragma solidity >=0.8.8 <0.9.0;

import {Script, console} from "forge-std/Script.sol";

import {IWormhole} from "../lib/wormhole-solidity-sdk/src/interfaces/IWormhole.sol";

contract SendGovernanceMessageScript is Script {
    function run(address wormholeBridgeAddress, uint8 consistencyLevel, bytes memory payload, uint32 nonce) public {
        IWormhole wormhole = IWormhole(wormholeBridgeAddress);

        vm.broadcast();
        uint64 sequence = wormhole.publishMessage(nonce, payload, consistencyLevel);

        console.log("Sequence:", sequence);
    }
}