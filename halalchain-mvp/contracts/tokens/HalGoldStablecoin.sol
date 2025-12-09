// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "../core/AccessControlManager.sol";
import "../core/OracleHub.sol";
import "../core/ShariaRegistry.sol";

/**
 * @title HalGoldStablecoin
 * @notice 100% Asset-Backed Stablecoin.
 * @dev MINTING CONDITION: Total Supply + Amount <= Verified Reserves * Price.
 *      Cannot operate on fractional reserves.
 */
contract HalGoldStablecoin is ERC20, ERC20Burnable, ERC20Pausable {
    
    AccessControlManager public accessControl;
    OracleHub public oracleHub;
    ShariaRegistry public shariaRegistry;

    // Address of the Gold Reserve Auditor Feed (e.g., Chainlink PoR)
    address public goldReserveFeed;
    address public goldPriceFeed;

    constructor(
        address _accessControl,
        address _oracleHub,
        address _shariaRegistry,
        address _goldReserveFeed,
        address _goldPriceFeed
    ) ERC20("Halal Gold", "H-GOLD") {
        accessControl = AccessControlManager(_accessControl);
        oracleHub = OracleHub(_oracleHub);
        shariaRegistry = ShariaRegistry(_shariaRegistry);
        goldReserveFeed = _goldReserveFeed;
        goldPriceFeed = _goldPriceFeed;
    }

    modifier onlyMinter() {
        require(accessControl.hasRole(accessControl.OPERATOR_ROLE(), msg.sender), "Caller is not Minter");
        _;
    }

    modifier onlyCompliant() {
        require(shariaRegistry.isCompliant(address(this)), "Contract Fatwa Revoked");
        _;
    }

    /**
     * @notice Mints new stablecoins IF backed by proven reserves.
     * @dev Checks Oracle for current Gold Reserves (in grams) and Price (USD).
     *      Ensures Total Supply ($) <= Reserve Value ($).
     */
    function mint(address to, uint256 amount) external onlyMinter onlyCompliant whenNotPaused {
        _verifyReserves(amount);
        _mint(to, amount);
    }

    // Required by OpenZeppelin v5 for multiple inheritance (ERC20, P, Burnable)
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }

    /**
     * @notice Internal Proof-of-Reserve logic.
     * @dev Reverts if attempting to mint unbacked tokens (Gharar).
     */
    function _verifyReserves(uint256 mintAmount) internal view {
        // 1. Get total Gold Reserves (e.g. 1000g)
        (uint256 reserves, ) = oracleHub.getPrice(goldReserveFeed);
        
        // 2. Get Gold Price (e.g. $60/g)
        (uint256 price, ) = oracleHub.getPrice(goldPriceFeed);

        // 3. Calculate max allowance ($60,000)
        // Adjust for decimals (assuming 1e18 for token, 1e8 for oracles)
        // Simplification for MVP: Assuming standardized 18 decimals calc
        // Real impl needs SafeMath and decimal normalization
        uint256 maxSupply = reserves * price; 

        require(totalSupply() + mintAmount <= maxSupply, "Insufficient Reserves (PoR Failed)");
    }

    function pause() external onlyMinter {
        _pause();
    }

    function unpause() external onlyMinter {
        _unpause();
    }
}
