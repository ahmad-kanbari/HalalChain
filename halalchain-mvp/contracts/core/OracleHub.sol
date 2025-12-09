// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./AccessControlManager.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function getRoundData(uint80 _roundId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title OracleHub
 * @notice Central source of truth for Asset Prices and Reserves.
 * @dev Wraps Chainlink feeds and adds "Gharar" (Uncertainty) checks for staleness.
 */
contract OracleHub {
    
    AccessControlManager public accessControl;
    
    // Asset Address -> Chainlink Feed Address
    mapping(address => address) public priceFeeds;
    
    // Asset Address -> Max Staleness (seconds)
    mapping(address => uint256) public maxStaleness;

    event FeedUpdated(address indexed asset, address feed, uint256 stalenessThreshold);

    constructor(address _accessControl) {
        require(_accessControl != address(0), "Invalid ACM");
        accessControl = AccessControlManager(_accessControl);
    }

    modifier onlyUpdater() {
        require(
            accessControl.hasRole(accessControl.ORACLE_UPDATER_ROLE(), msg.sender) ||
            accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), msg.sender),
            "Caller is not Oracle Updater"
        );
        _;
    }

    /**
     * @notice Registers a Chainlink feed for an asset.
     * @param asset The asset/token address (or address(0) for special purpose).
     * @param feed The Chainlink Aggregator address.
     * @param _maxStaleness Max seconds allowed since last update.
     */
    function setFeed(address asset, address feed, uint256 _maxStaleness) external onlyUpdater {
        priceFeeds[asset] = feed;
        maxStaleness[asset] = _maxStaleness;
        emit FeedUpdated(asset, feed, _maxStaleness);
    }

    /**
     * @notice Gets the latest price with strict Gharar (staleness) checks.
     * @return price The price with 8 decimals (standard Chainlink).
     * @return decimals The decimals of the feed.
     */
    function getPrice(address asset) external view returns (uint256 price, uint8 decimals) {
        address feedAddr = priceFeeds[asset];
        require(feedAddr != address(0), "Feed not found");

        AggregatorV3Interface feed = AggregatorV3Interface(feedAddr);
        
        try feed.latestRoundData() returns (
            uint80 /* roundId */,
            int256 answer,
            uint256 /* startedAt */,
            uint256 updatedAt,
            uint80 /* answeredInRound */
        ) {
            require(answer > 0, "Price must be positive");
            require(block.timestamp - updatedAt <= maxStaleness[asset], "Data Stale (Gharar)");
            
            return (uint256(answer), feed.decimals());
        } catch {
            revert("Oracle Unreachable");
        }
    }
}
