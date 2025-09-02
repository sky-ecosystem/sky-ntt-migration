// SPDX-License-Identifier: Apache 2
pragma solidity >=0.8.8 <0.9.0;

import {console2} from "forge-std/Script.sol";

import "../src/interfaces/INttManager.sol";
import "../src/interfaces/IManagerBase.sol";

import {NttManager} from "../src/NttManager/NttManager.sol";
import {NttManagerMigrateable} from "../src/NttManager/NttManagerMigrateable.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PausableUpgradeable} from "../src/libraries/PausableUpgradeable.sol";
import { Upgrades } from "openzeppelin-foundry-upgrades/LegacyUpgrades.sol";
import { DefenderOptions, Options, TxOverrides } from "openzeppelin-foundry-upgrades/Options.sol";

import {ParseNttConfig} from "./helpers/ParseNttConfig.sol";

contract SimulateNttManagerUpgradeScript is ParseNttConfig {
    struct DeploymentParams {
        address token;
        INttManager.Mode mode;
        uint16 wormholeChainId;
        uint64 rateLimitDuration;
        bool shouldSkipRatelimiter;
    }

    function upgradeNttManager(
        INttManager nttManagerProxy,
        DeploymentParams memory params
    ) internal {

        // Upgrade the proxy.
        Upgrades.upgradeProxy(address(nttManagerProxy), "NttManagerMigrateable.sol", "", Options({
            constructorData: abi.encode(params.token, params.mode, params.wormholeChainId, params.rateLimitDuration, params.shouldSkipRatelimiter),
            referenceContract: "",
            referenceBuildInfoDir: "",
            exclude: new string[](0),
            unsafeAllow: "",
            unsafeAllowRenames: false,
            unsafeSkipProxyAdminCheck: false,
            unsafeSkipStorageCheck: false,
            unsafeSkipAllChecks: false,
            defender: DefenderOptions({
                txOverrides: TxOverrides({
                    gasLimit: 0,
                    gasPrice: 0,
                    maxFeePerGas: 0,
                    maxPriorityFeePerGas: 0
                }),
                useDefenderDeploy: false,
                skipVerifySourceCode: false,
                relayerId: "",
                salt: "",
                upgradeApprovalProcessId: "",
                licenseType: "",
                skipLicenseType: false,
                metadata: ""
            })
        }));
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

        console2.log("before upgrade");
        console2.log("Is NttManager paused: ", nttManager.isPaused());

        vm.expectRevert();
        nttManager.isSendPaused();

        vm.startPrank(nttManager.owner());
        upgradeNttManager(nttManager, params);
        vm.stopPrank();

        console2.log("after upgrade");
        console2.log("Is NttManager paused: ", nttManager.isPaused());
        console2.log("Is NttManager send paused: ", nttManager.isSendPaused());

        // simulate a transfer from account that has balance
        vm.deal(address(nttManager), 1 ether);
        vm.startPrank(address(nttManager));
        (, uint256 totalPriceQuote) = nttManager.quoteDeliveryPrice(1, new bytes(1));
        nttManager.transfer{value: totalPriceQuote}(1 ether, 1, 0x000000000000000000000000000000000000000000000000000000000000dead);
        vm.stopPrank();

        vm.startPrank(nttManager.owner());
        nttManager.setPause(true, true);
        vm.stopPrank();

        console2.log("after pauseSend");
        console2.log("Is NttManager paused: ", nttManager.isPaused());
        console2.log("Is NttManager send paused: ", nttManager.isSendPaused());

        // try transfer again but this time it should revert because the send is paused
        vm.startPrank(address(nttManager));
        (, totalPriceQuote) = nttManager.quoteDeliveryPrice(1, new bytes(1));
        vm.expectRevert(PausableUpgradeable.RequireContractSendIsNotPaused.selector);
        nttManager.transfer{value: totalPriceQuote}(1 ether, 1, 0x000000000000000000000000000000000000000000000000000000000000dead);
        vm.stopPrank();
    }
}
