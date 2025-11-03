// SPDX-License-Identifier: Apache 2
pragma solidity >=0.8.8 <0.9.0;

import {console2} from "forge-std/Script.sol";

import "../src/interfaces/INttManager.sol";
import "../src/interfaces/IManagerBase.sol";

import {NttManager} from "../src/NttManager/NttManager.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PausableUpgradeable} from "../src/libraries/PausableUpgradeable.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {ParseNttConfig} from "./helpers/ParseNttConfig.sol";

contract SimulateNttManagerUpgradeScript is ParseNttConfig {
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

        NttManager nttManager = NttManager(0x7d4958454a3f520bDA8be764d06591B054B0bf33);

        console2.log("\n=== before upgrade ===");

        require(nttManager.token() == params.token);
        require(nttManager.mode() == params.mode);
        require(nttManager.chainId() == params.wormholeChainId);
        require(nttManager.rateLimitDuration() == params.rateLimitDuration);
        console2.log("Deployment params match:  true");

        bytes memory testTransferData = abi.encodeWithSignature(
            "transfer(uint256,uint16,bytes32)", 1000000000000000000, 2, bytes32(uint256(123))
        );
        (bool success, bytes memory returnData) = address(nttManager).call(testTransferData);
        // before upgrade transfer() should be callable, but can revert with domain logic error
        require(
            !success
                && keccak256(returnData)
                    == keccak256(abi.encodeWithSignature("Error(string)", "Usds/insufficient-balance"))
        );
        console2.log("Method transfer() exists: true");

        vm.startPrank(nttManager.owner());
        address implementation = 0x7A36d02066f7EaFab5a7738403c98E1AC09DD2AD;
        nttManager.upgrade(address(implementation));
        vm.stopPrank();

        console2.log("\n=== after upgrade ===");
        require(nttManager.token() == params.token);
        require(nttManager.mode() == params.mode);
        require(nttManager.chainId() == params.wormholeChainId);
        require(nttManager.rateLimitDuration() == params.rateLimitDuration);
        console2.log("Deployment params match:  true");
        (success, returnData) = address(nttManager).call(testTransferData);
        // now the transfer() reverts with empty revert reason, because we removed transfer() from the implementation
        require(!success && returnData.length == 0);
        console2.log("Method transfer() exists: false");

        console2.log("\n=== migrate locked tokens ===");
        address OFTAdapter = 0x1e1D42781FC170EF9da004Fb735f56F0276d01B8;
        uint256 balance = IERC20(nttManager.token()).balanceOf(address(nttManager));
        console2.log("Balance of NttManager: ", balance);
        vm.prank(nttManager.owner());
        nttManager.migrateLockedTokens(OFTAdapter);
        console2.log("Balance of NttManager after migrate: ", IERC20(nttManager.token()).balanceOf(address(nttManager)));
        console2.log("Balance of OFTAdapter after migrate: ", IERC20(nttManager.token()).balanceOf(OFTAdapter));
        require(IERC20(nttManager.token()).balanceOf(address(nttManager)) == 0);
        require(IERC20(nttManager.token()).balanceOf(OFTAdapter) == balance);
    }
}
