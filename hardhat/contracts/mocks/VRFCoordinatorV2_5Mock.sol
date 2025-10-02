// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {VRFCoordinatorV2_5Mock as VRFCoordinatorV2_5Mock_Base} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract VRFCoordinatorV2_5Mock is VRFCoordinatorV2_5Mock_Base {
    constructor(uint96 _baseFee, uint96 _gasPrice, int256 _weiPerUnitLink) VRFCoordinatorV2_5Mock_Base(_baseFee, _gasPrice, _weiPerUnitLink) {}
}