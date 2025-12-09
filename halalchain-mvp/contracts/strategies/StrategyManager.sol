// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../core/AccessControlManager.sol";
import "../core/ShariaRegistry.sol";
import "../interfaces/IInvestmentStrategy.sol";

/**
 * @title StrategyManager
 * @notice Central hub for managing multiple Sharia-compliant investment strategies
 * @dev Allocates capital, enforces diversification limits, and harvests returns
 *      Integrates with MudarabahPool for automated yield generation
 */
contract StrategyManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =========================================================
    //                        STRUCTS
    // =========================================================

    struct StrategyInfo {
        address strategy;           // Strategy contract address
        uint256 allocation;         // Current capital deployed
        uint256 maxAllocationBps;   // Max % of total assets (basis points)
        uint256 totalReturns;       // Lifetime returns earned
        uint256 lastHarvest;        // Last harvest timestamp
        bool active;                // Can allocate new capital
        string name;                // Human-readable name
    }

    // =========================================================
    //                        STATE
    // =========================================================

    AccessControlManager public accessControl;
    ShariaRegistry public shariaRegistry;
    IERC20 public immutable asset; // HAL-GOLD

    mapping(uint256 => StrategyInfo) public strategies;
    uint256 public nextStrategyId;

    uint256 public totalAllocated;
    uint256 public totalReturnsEarned;

    // Risk management
    uint256 public constant MAX_STRATEGY_ALLOCATION = 4000; // 40% max per strategy
    uint256 public constant MIN_LIQUIDITY_RESERVE = 2000;   // 20% min kept liquid

    address public vault; // MudarabahPool or MudarabahVault

    // =========================================================
    //                        EVENTS
    // =========================================================

    event StrategyAdded(uint256 indexed strategyId, address strategy, string name, uint256 maxAllocationBps);
    event StrategyRemoved(uint256 indexed strategyId);
    event StrategyStatusChanged(uint256 indexed strategyId, bool active);
    event CapitalAllocated(uint256 indexed strategyId, uint256 amount);
    event CapitalWithdrawn(uint256 indexed strategyId, uint256 amount);
    event ReturnsHarvested(uint256 indexed strategyId, uint256 amount);
    event AllReturnsHarvested(uint256 totalHarvested);
    event VaultSet(address newVault);

    // =========================================================
    //                      MODIFIERS
    // =========================================================

    modifier onlyAdmin() {
        require(
            accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), msg.sender),
            "Admin only"
        );
        _;
    }

    modifier onlyManager() {
        require(
            accessControl.hasRole(accessControl.MUDARIB_ROLE(), msg.sender) ||
            accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), msg.sender),
            "Manager only"
        );
        _;
    }

    modifier onlyVault() {
        require(msg.sender == vault, "Vault only");
        _;
    }

    // =========================================================
    //                     CONSTRUCTOR
    // =========================================================

    constructor(
        address _asset,
        address _accessControl,
        address _shariaRegistry,
        address _vault
    ) {
        require(_asset != address(0), "Invalid asset");
        require(_accessControl != address(0), "Invalid ACM");
        require(_shariaRegistry != address(0), "Invalid registry");
        require(_vault != address(0), "Invalid vault");

        asset = IERC20(_asset);
        accessControl = AccessControlManager(_accessControl);
        shariaRegistry = ShariaRegistry(_shariaRegistry);
        vault = _vault;
    }

    // =========================================================
    //                   STRATEGY MANAGEMENT
    // =========================================================

    /**
     * @notice Add a new investment strategy
     * @param strategy Strategy contract address
     * @param maxAllocationBps Maximum allocation in basis points
     * @param name Human-readable strategy name
     */
    function addStrategy(
        address strategy,
        uint256 maxAllocationBps,
        string calldata name
    ) external onlyAdmin {
        require(strategy != address(0), "Invalid strategy");
        require(maxAllocationBps <= MAX_STRATEGY_ALLOCATION, "Allocation too high");
        require(shariaRegistry.isCompliant(strategy), "Strategy not Sharia-compliant");

        // Verify strategy implements interface
        IInvestmentStrategy strat = IInvestmentStrategy(strategy);
        require(strat.asset() == address(asset), "Asset mismatch");
        require(strat.isShariaCompliant(), "Strategy reports non-compliant");

        uint256 id = nextStrategyId++;
        strategies[id] = StrategyInfo({
            strategy: strategy,
            allocation: 0,
            maxAllocationBps: maxAllocationBps,
            totalReturns: 0,
            lastHarvest: block.timestamp,
            active: true,
            name: name
        });

        emit StrategyAdded(id, strategy, name, maxAllocationBps);
    }

    /**
     * @notice Remove a strategy (must withdraw all capital first)
     */
    function removeStrategy(uint256 strategyId) external onlyAdmin {
        require(strategies[strategyId].strategy != address(0), "Strategy not found");
        require(strategies[strategyId].allocation == 0, "Must withdraw all capital first");

        strategies[strategyId].active = false;
        emit StrategyRemoved(strategyId);
    }

    /**
     * @notice Activate or deactivate a strategy
     */
    function setStrategyStatus(uint256 strategyId, bool active) external onlyAdmin {
        require(strategies[strategyId].strategy != address(0), "Strategy not found");
        strategies[strategyId].active = active;
        emit StrategyStatusChanged(strategyId, active);
    }

    /**
     * @notice Update max allocation for a strategy
     */
    function setMaxAllocation(uint256 strategyId, uint256 maxAllocationBps) external onlyAdmin {
        require(strategies[strategyId].strategy != address(0), "Strategy not found");
        require(maxAllocationBps <= MAX_STRATEGY_ALLOCATION, "Allocation too high");
        strategies[strategyId].maxAllocationBps = maxAllocationBps;
    }

    // =========================================================
    //                   CAPITAL ALLOCATION
    // =========================================================

    /**
     * @notice Allocate capital to a specific strategy
     * @param strategyId Strategy to invest in
     * @param amount Amount to allocate
     */
    function allocateToStrategy(uint256 strategyId, uint256 amount)
        external
        onlyManager
        nonReentrant
    {
        StrategyInfo storage strat = strategies[strategyId];
        require(strat.strategy != address(0), "Strategy not found");
        require(strat.active, "Strategy not active");
        require(amount > 0, "Amount must be > 0");

        // Check allocation limits
        uint256 vaultBalance = asset.balanceOf(vault);
        uint256 maxAllocation = (vaultBalance * strat.maxAllocationBps) / 10000;
        require(strat.allocation + amount <= maxAllocation, "Exceeds max allocation");

        // Check liquidity reserve
        uint256 totalAfter = totalAllocated + amount;
        uint256 minReserve = (vaultBalance * MIN_LIQUIDITY_RESERVE) / 10000;
        require(vaultBalance >= totalAfter + minReserve, "Insufficient liquidity reserve");

        // Transfer from vault to strategy
        asset.safeTransferFrom(vault, address(this), amount);
        asset.safeApprove(strat.strategy, amount);

        uint256 actualInvested = IInvestmentStrategy(strat.strategy).invest(amount);

        strat.allocation += actualInvested;
        totalAllocated += actualInvested;

        emit CapitalAllocated(strategyId, actualInvested);
    }

    /**
     * @notice Withdraw capital from a strategy
     */
    function withdrawFromStrategy(uint256 strategyId, uint256 amount)
        external
        onlyManager
        nonReentrant
        returns (uint256)
    {
        StrategyInfo storage strat = strategies[strategyId];
        require(strat.strategy != address(0), "Strategy not found");
        require(amount > 0 && amount <= strat.allocation, "Invalid amount");

        uint256 actualWithdrawn = IInvestmentStrategy(strat.strategy).withdraw(amount);

        strat.allocation -= actualWithdrawn;
        totalAllocated -= actualWithdrawn;

        // Send back to vault
        asset.safeTransfer(vault, actualWithdrawn);

        emit CapitalWithdrawn(strategyId, actualWithdrawn);
        return actualWithdrawn;
    }

    // =========================================================
    //                   HARVEST RETURNS
    // =========================================================

    /**
     * @notice Harvest returns from a specific strategy
     */
    function harvestStrategy(uint256 strategyId)
        external
        nonReentrant
        returns (uint256)
    {
        StrategyInfo storage strat = strategies[strategyId];
        require(strat.strategy != address(0), "Strategy not found");

        uint256 returns = IInvestmentStrategy(strat.strategy).claimReturns();

        if (returns > 0) {
            strat.totalReturns += returns;
            strat.lastHarvest = block.timestamp;
            totalReturnsEarned += returns;

            // Send returns to vault
            asset.safeTransfer(vault, returns);

            emit ReturnsHarvested(strategyId, returns);
        }

        return returns;
    }

    /**
     * @notice Harvest returns from ALL active strategies
     * @return totalHarvested Total returns collected
     */
    function harvestAll() external nonReentrant returns (uint256) {
        uint256 totalHarvested = 0;

        for (uint256 i = 0; i < nextStrategyId; i++) {
            StrategyInfo storage strat = strategies[i];
            if (strat.strategy != address(0) && strat.active && strat.allocation > 0) {
                try IInvestmentStrategy(strat.strategy).claimReturns() returns (uint256 returns) {
                    if (returns > 0) {
                        strat.totalReturns += returns;
                        strat.lastHarvest = block.timestamp;
                        totalReturnsEarned += returns;
                        totalHarvested += returns;

                        emit ReturnsHarvested(i, returns);
                    }
                } catch {
                    // Skip strategies that fail, don't revert entire harvest
                    continue;
                }
            }
        }

        if (totalHarvested > 0) {
            // Send all harvested returns to vault
            asset.safeTransfer(vault, totalHarvested);
            emit AllReturnsHarvested(totalHarvested);
        }

        return totalHarvested;
    }

    // =========================================================
    //                   EMERGENCY FUNCTIONS
    // =========================================================

    /**
     * @notice Emergency withdraw from all strategies
     */
    function emergencyWithdrawAll() external onlyAdmin nonReentrant returns (uint256) {
        uint256 totalWithdrawn = 0;

        for (uint256 i = 0; i < nextStrategyId; i++) {
            StrategyInfo storage strat = strategies[i];
            if (strat.strategy != address(0) && strat.allocation > 0) {
                try IInvestmentStrategy(strat.strategy).emergencyWithdraw() returns (uint256 withdrawn) {
                    strat.allocation = 0;
                    totalAllocated -= withdrawn;
                    totalWithdrawn += withdrawn;
                    emit CapitalWithdrawn(i, withdrawn);
                } catch {
                    continue;
                }
            }
        }

        if (totalWithdrawn > 0) {
            asset.safeTransfer(vault, totalWithdrawn);
        }

        return totalWithdrawn;
    }

    /**
     * @notice Sharia Board can blacklist a non-compliant strategy
     */
    function blacklistStrategy(uint256 strategyId) external {
        require(
            accessControl.hasRole(accessControl.SHARIA_BOARD_ROLE(), msg.sender),
            "Sharia Board only"
        );

        StrategyInfo storage strat = strategies[strategyId];
        require(strat.strategy != address(0), "Strategy not found");

        strat.active = false;

        // Emergency withdraw
        if (strat.allocation > 0) {
            try IInvestmentStrategy(strat.strategy).emergencyWithdraw() returns (uint256 withdrawn) {
                strat.allocation = 0;
                totalAllocated -= withdrawn;
                asset.safeTransfer(vault, withdrawn);
                emit CapitalWithdrawn(strategyId, withdrawn);
            } catch {
                // If emergency withdraw fails, mark as inactive but leave funds
            }
        }

        emit StrategyStatusChanged(strategyId, false);
    }

    // =========================================================
    //                     VIEW FUNCTIONS
    // =========================================================

    /**
     * @notice Get weighted average APY across all strategies
     */
    function getTotalAPY() external view returns (uint256) {
        if (totalAllocated == 0) return 0;

        uint256 totalAPY = 0;
        uint256 totalWeight = 0;

        for (uint256 i = 0; i < nextStrategyId; i++) {
            StrategyInfo storage strat = strategies[i];
            if (strat.strategy != address(0) && strat.active && strat.allocation > 0) {
                uint256 stratAPY = IInvestmentStrategy(strat.strategy).getAPY();
                uint256 weight = strat.allocation;
                totalAPY += stratAPY * weight;
                totalWeight += weight;
            }
        }

        return totalWeight > 0 ? totalAPY / totalWeight : 0;
    }

    /**
     * @notice Get strategy info by ID
     */
    function getStrategy(uint256 strategyId) external view returns (
        address strategy,
        uint256 allocation,
        uint256 maxAllocationBps,
        uint256 totalReturns,
        uint256 lastHarvest,
        bool active,
        string memory name
    ) {
        StrategyInfo storage strat = strategies[strategyId];
        return (
            strat.strategy,
            strat.allocation,
            strat.maxAllocationBps,
            strat.totalReturns,
            strat.lastHarvest,
            strat.active,
            strat.name
        );
    }

    /**
     * @notice Get pending returns for a strategy
     */
    function getPendingReturns(uint256 strategyId) external view returns (uint256) {
        StrategyInfo storage strat = strategies[strategyId];
        if (strat.strategy == address(0)) return 0;
        return IInvestmentStrategy(strat.strategy).getPendingReturns();
    }

    /**
     * @notice Get total pending returns across all strategies
     */
    function getTotalPendingReturns() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < nextStrategyId; i++) {
            StrategyInfo storage strat = strategies[i];
            if (strat.strategy != address(0) && strat.active) {
                total += IInvestmentStrategy(strat.strategy).getPendingReturns();
            }
        }
        return total;
    }

    /**
     * @notice Set vault address (for initial setup or migration)
     */
    function setVault(address _vault) external onlyAdmin {
        require(_vault != address(0), "Invalid vault");
        vault = _vault;
        emit VaultSet(_vault);
    }
}
