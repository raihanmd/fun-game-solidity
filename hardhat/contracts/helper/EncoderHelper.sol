// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library EncoderHelper {
    function encodeUint64(uint256 value) external pure returns (bytes memory) {
        return abi.encode(value);
    }
}