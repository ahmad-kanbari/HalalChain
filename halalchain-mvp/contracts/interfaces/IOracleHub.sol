// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IOracleHub {
    event FeedUpdated(address indexed asset, address feed, uint256 stalenessThreshold);

    function setFeed(address asset, address feed, uint256 _maxStaleness) external;
    function getPrice(address asset) external view returns (uint256 price, uint8 decimals);
}
