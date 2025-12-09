// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../core/AccessControlManager.sol";
import "../core/ShariaRegistry.sol";

/**
 * @title MudarabahPool
 * @notice A Sharia-Compliant "Vault" where Users (capital) and Managers (labor) partner.
 * @dev Implements ERC4626 for composability, but with restricted withdrawal/deployment logic.
 *      NO Guaranteed Returns. Users bear financial loss; Manager bears time loss.
 */
contract MudarabahPool is ERC4626, ReentrancyGuard {
    using SafeERC20 for IERC20;

    AccessControlManager public accessControl;
    ShariaRegistry public shariaRegistry;

    // =========================================================
    //                        CONFIG
    // =========================================================
    
    /// @dev Profit Sharing Ratio (Basis Points). 3000 = 30% to Manager.
    uint256 public managerFeeBps; 
    
    /// @dev Address where Manager fees are sent
    address public managerFeeRecipient;

    // =========================================================
    //                        STATE
    // =========================================================

    /// @notice Whitelisted destinations for capital deployment (e.g. Sukuk Contracts)
    mapping(address => bool) public allowedTargets;

    event ProfitRealized(uint256 totalEth, uint256 netToPool, uint256 feeToManager);
    event CapitalDeployed(address indexed target, uint256 amount);
    event CapitalReturned(address indexed source, uint256 amount);

    // =========================================================
    //                       FUNCTIONS
    // =========================================================

    constructor(
        IERC20 _asset, 
        address _accessControl,
        address _shariaRegistry,
        uint256 _managerFeeBps,
        address _managerFeeRecipient
    ) ERC4626(_asset) ERC20("Mudarabah Share", "mSHARE") {
        accessControl = AccessControlManager(_accessControl);
        shariaRegistry = ShariaRegistry(_shariaRegistry);
        managerFeeBps = _managerFeeBps;
        managerFeeRecipient = _managerFeeRecipient;
    }

    modifier onlyManager() {
        require(accessControl.hasRole(accessControl.MUDARIB_ROLE(), msg.sender), "Caller not Mudarib");
        _;
    }

    modifier onlyCompliant() {
        require(shariaRegistry.isCompliant(address(this)), "Pool Non-Compliant");
        _;
    }

    /**
     * @notice Manager invests pool funds into a Real World Asset (Sukuk) or Venture.
     * @dev Target MUST be Sharia Compliant and Whitelisted.
     */
    function deployCapital(address target, uint256 amount) external onlyManager onlyCompliant nonReentrant {
        require(allowedTargets[target], "Target not allowed");
        require(shariaRegistry.isCompliant(target), "Target Non-Compliant");
        
        IERC20(asset()).safeTransfer(target, amount);
        emit CapitalDeployed(target, amount);
    }

    /**
     * @notice Projects return capital + profit/loss back to the pool.
     * @dev Calculates pure profit, splits it sharing ratio, and updates NAV.
     * No "Interest" calculation here. Just realizing actual returns.
     */
    function realizeProfit(uint256 profitAmount) external nonReentrant {
        // In this simplified MVP model, we assume the caller *sends* the tokens before calling,
        // or approves transfer. For safety, let's assume tokens were pushed to the contract 
        // and this function effectively "accounting-izes" them.
        // real implementation would likely use pull payment from the Sukuk contract.
        
        // Fee Logic
        uint256 managerShare = (profitAmount * managerFeeBps) / 10000;
        uint256 poolShare = profitAmount - managerShare;
        
        if (managerShare > 0) {
            IERC20(asset()).safeTransfer(managerFeeRecipient, managerShare);
        }
        
        emit ProfitRealized(profitAmount, poolShare, managerShare);
        
        // Note: the 'totalAssets' function of ERC4626 automatically tracks balance of this contract.
        // So the share price increases automatically when profit stays in the contract.
    }

    /**
     * @notice Admin function to whitelist investment targets.
     */
    function allowTarget(address target, bool status) external {
        require(accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), msg.sender), "Admin only");
        allowedTargets[target] = status;
    }

    // =========================================================
    //              STRATEGY MANAGER INTEGRATION
    // =========================================================

    address public strategyManager;

    event StrategyManagerSet(address indexed strategyManager);
    event ReturnsHarvested(uint256 amount);

    /**
     * @notice Set the StrategyManager address (one-time setup)
     */
    function setStrategyManager(address _strategyManager) external {
        require(accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), msg.sender), "Admin only");
        require(_strategyManager != address(0), "Invalid StrategyManager");
        require(shariaRegistry.isCompliant(_strategyManager), "StrategyManager not compliant");

        strategyManager = _strategyManager;
        allowedTargets[_strategyManager] = true; // Automatically whitelist

        emit StrategyManagerSet(_strategyManager);
    }

    /**
     * @notice Harvest returns from all investment strategies
     * @dev Anyone can call to trigger profit collection
     */
    function harvestReturns() external nonReentrant returns (uint256) {
        require(strategyManager != address(0), "StrategyManager not set");

        // Import interface (simplified - assumes StrategyManager has harvestAll)
        (bool success, bytes memory data) = strategyManager.call(
            abi.encodeWithSignature("harvestAll()")
        );

        require(success, "Harvest failed");
        uint256 harvested = abi.decode(data, (uint256));

        if (harvested > 0) {
            // Profits automatically increase totalAssets() since they're in this contract
            // Take manager fee
            uint256 managerShare = (harvested * managerFeeBps) / 10000;
            uint256 poolShare = harvested - managerShare;

            if (managerShare > 0) {
                IERC20(asset()).safeTransfer(managerFeeRecipient, managerShare);
            }

            emit ReturnsHarvested(harvested);
            emit ProfitRealized(harvested, poolShare, managerShare);
        }

        return harvested;
    }

    /**
     * @notice Get estimated APY from strategy allocations
     */
    function getEstimatedAPY() external view returns (uint256) {
        if (strategyManager == address(0)) return 0;

        (bool success, bytes memory data) = strategyManager.staticcall(
            abi.encodeWithSignature("getTotalAPY()")
        );

        if (!success) return 0;
        return abi.decode(data, (uint256));
    }

    /**
     * @notice Get total capital allocated to strategies
     */
    function getTotalAllocated() external view returns (uint256) {
        if (strategyManager == address(0)) return 0;

        (bool success, bytes memory data) = strategyManager.staticcall(
            abi.encodeWithSignature("totalAllocated()")
        );

        if (!success) return 0;
        return abi.decode(data, (uint256));
    }
}
