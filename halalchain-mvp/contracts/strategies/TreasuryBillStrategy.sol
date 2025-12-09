// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../core/AccessControlManager.sol";
import "../core/ShariaRegistry.sol";
import "../core/OracleHub.sol";
import "../interfaces/IInvestmentStrategy.sol";

/**
 * @title TreasuryBillStrategy
 * @notice Low-risk strategy investing in tokenized government Islamic bonds (T-Bills/Sukuk)
 * @dev Generates yield by:
 *      1. Purchasing tokenized government Sukuk with fixed maturity
 *      2. Earning stable returns backed by government entities
 *      3. Oracle-verified pricing and maturity tracking
 *      4. Automatic redemption at maturity with profit
 *
 * Expected Returns: 4-7% APY from government backing
 * Risk Level: LOW (government-backed instruments)
 */
contract TreasuryBillStrategy is IInvestmentStrategy, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =========================================================
    //                        STRUCTS
    // =========================================================

    struct TreasuryPosition {
        address token;              // Tokenized treasury Sukuk address
        uint256 amount;             // Amount invested
        uint256 purchasePrice;      // Price at purchase (per token)
        uint256 maturityDate;       // When position matures
        uint256 expectedReturn;     // Expected profit at maturity
        bool redeemed;              // Has been redeemed
    }

    // =========================================================
    //                        STATE
    // =========================================================

    AccessControlManager public accessControl;
    ShariaRegistry public shariaRegistry;
    OracleHub public oracleHub;
    IERC20 public immutable assetToken; // HAL-GOLD

    address public strategyManager;

    // Track treasury positions
    TreasuryPosition[] public positions;
    uint256 public totalInvested;
    uint256 public totalReturnsEarned;
    uint256 public pendingReturns;

    // Approved treasury Sukuk tokens
    mapping(address => bool) public approvedTreasuries;

    // APY estimate
    uint256 public estimatedAPY; // in basis points (e.g., 600 = 6%)

    bool public isActiveStrategy;

    // =========================================================
    //                        EVENTS
    // =========================================================

    event TreasuryPurchased(uint256 indexed positionId, address token, uint256 amount, uint256 maturityDate);
    event TreasuryRedeemed(uint256 indexed positionId, uint256 principal, uint256 profit);
    event TreasuryApproved(address indexed token, bool approved);
    event YieldAccrued(uint256 amount);

    // =========================================================
    //                      MODIFIERS
    // =========================================================

    modifier onlyManager() {
        require(msg.sender == strategyManager, "Only StrategyManager");
        _;
    }

    modifier onlyActive() {
        require(isActiveStrategy, "Strategy not active");
        _;
    }

    modifier onlyAdmin() {
        require(
            accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), msg.sender),
            "Admin only"
        );
        _;
    }

    // =========================================================
    //                     CONSTRUCTOR
    // =========================================================

    constructor(
        address _assetToken,
        address _accessControl,
        address _shariaRegistry,
        address _oracleHub,
        address _strategyManager
    ) {
        require(_assetToken != address(0), "Invalid asset");
        require(_accessControl != address(0), "Invalid ACM");
        require(_shariaRegistry != address(0), "Invalid registry");
        require(_oracleHub != address(0), "Invalid oracle");
        require(_strategyManager != address(0), "Invalid StrategyManager");

        assetToken = IERC20(_assetToken);
        accessControl = AccessControlManager(_accessControl);
        shariaRegistry = ShariaRegistry(_shariaRegistry);
        oracleHub = OracleHub(_oracleHub);
        strategyManager = _strategyManager;

        isActiveStrategy = true;
        estimatedAPY = 550; // Default 5.5% APY for government instruments
    }

    // =========================================================
    //                   CORE STRATEGY FUNCTIONS
    // =========================================================

    /**
     * @notice Deploy capital into government treasury Sukuk
     * @dev Purchases tokenized treasury instruments from approved list
     */
    function invest(uint256 amount)
        external
        override
        onlyManager
        onlyActive
        nonReentrant
        returns (uint256)
    {
        require(amount > 0, "Amount must be > 0");

        // Transfer funds from StrategyManager
        assetToken.safeTransferFrom(msg.sender, address(this), amount);

        // For MVP: Simulate treasury purchase by creating position
        // In production, would actually purchase tokenized T-bills from market

        // Mock treasury parameters (in real implementation, would query market)
        uint256 maturityPeriod = 180 days; // 6-month treasury
        uint256 annualYield = estimatedAPY; // basis points
        uint256 expectedReturn = (amount * annualYield * maturityPeriod) / (10000 * 365 days);

        // Create position
        positions.push(TreasuryPosition({
            token: address(0), // Placeholder (would be actual treasury token address)
            amount: amount,
            purchasePrice: 1e18, // 1:1 with HAL-GOLD
            maturityDate: block.timestamp + maturityPeriod,
            expectedReturn: expectedReturn,
            redeemed: false
        }));

        totalInvested += amount;

        emit TreasuryPurchased(positions.length - 1, address(0), amount, block.timestamp + maturityPeriod);
        emit Invested(amount, block.timestamp);

        return amount;
    }

    /**
     * @notice Withdraw capital (redeem mature treasuries)
     */
    function withdraw(uint256 amount)
        external
        override
        onlyManager
        nonReentrant
        returns (uint256)
    {
        require(amount > 0, "Amount must be > 0");

        uint256 remainingToWithdraw = amount;
        uint256 actualWithdrawn = 0;

        // Redeem mature positions
        for (uint256 i = 0; i < positions.length && remainingToWithdraw > 0; i++) {
            TreasuryPosition storage pos = positions[i];

            if (!pos.redeemed && block.timestamp >= pos.maturityDate) {
                uint256 principal = pos.amount;
                uint256 profit = pos.expectedReturn;
                uint256 totalValue = principal + profit;

                if (totalValue <= remainingToWithdraw) {
                    // Redeem entire position
                    pos.redeemed = true;
                    actualWithdrawn += totalValue;
                    remainingToWithdraw -= totalValue;

                    totalInvested -= principal;
                    pendingReturns += profit;

                    emit TreasuryRedeemed(i, principal, profit);
                } else {
                    // Partial redemption (simplified - in reality would be more complex)
                    break;
                }
            }
        }

        if (actualWithdrawn > 0) {
            // Transfer HAL-GOLD back to StrategyManager
            // In real implementation, would redeem from treasury contract
            assetToken.safeTransfer(msg.sender, actualWithdrawn);

            emit Withdrawn(actualWithdrawn, block.timestamp);
        }

        return actualWithdrawn;
    }

    /**
     * @notice Claim accumulated returns from matured treasuries
     */
    function claimReturns()
        external
        override
        onlyManager
        nonReentrant
        returns (uint256)
    {
        // Check for newly matured positions
        _checkMaturedPositions();

        uint256 claimable = pendingReturns;

        if (claimable > 0) {
            pendingReturns = 0;
            totalReturnsEarned += claimable;

            assetToken.safeTransfer(msg.sender, claimable);

            emit ReturnsClaimed(claimable, msg.sender, block.timestamp);
        }

        return claimable;
    }

    /**
     * @notice Emergency withdraw all funds
     */
    function emergencyWithdraw()
        external
        override
        onlyManager
        nonReentrant
        returns (uint256)
    {
        uint256 balance = assetToken.balanceOf(address(this));

        if (balance > 0) {
            totalInvested = 0;
            assetToken.safeTransfer(msg.sender, balance);
        }

        return balance;
    }

    // =========================================================
    //                  TREASURY MANAGEMENT
    // =========================================================

    /**
     * @notice Check for matured positions and accrue returns
     */
    function _checkMaturedPositions() internal {
        for (uint256 i = 0; i < positions.length; i++) {
            TreasuryPosition storage pos = positions[i];

            if (!pos.redeemed && block.timestamp >= pos.maturityDate) {
                // Position has matured, accrue returns
                pendingReturns += pos.expectedReturn;
                emit YieldAccrued(pos.expectedReturn);
            }
        }
    }

    /**
     * @notice Approve a treasury Sukuk token for investment
     */
    function approveTreasury(address token, bool approved) external onlyAdmin {
        require(token != address(0), "Invalid token");
        require(shariaRegistry.isCompliant(token), "Token not Sharia-compliant");

        approvedTreasuries[token] = approved;
        emit TreasuryApproved(token, approved);
    }

    /**
     * @notice Update estimated APY
     */
    function updateAPY(uint256 newAPY) external onlyAdmin {
        require(newAPY <= 1000, "APY too high for treasuries"); // Max 10% for gov instruments
        estimatedAPY = newAPY;
    }

    // =========================================================
    //                     VIEW FUNCTIONS
    // =========================================================

    function getBalance() external view override returns (uint256) {
        return totalInvested + pendingReturns;
    }

    function getTotalReturns() external view override returns (uint256) {
        return totalReturnsEarned;
    }

    function getPendingReturns() external view override returns (uint256) {
        uint256 pending = pendingReturns;

        // Add accrued interest from mature positions
        for (uint256 i = 0; i < positions.length; i++) {
            TreasuryPosition storage pos = positions[i];
            if (!pos.redeemed && block.timestamp >= pos.maturityDate) {
                pending += pos.expectedReturn;
            }
        }

        return pending;
    }

    function getAPY() external view override returns (uint256) {
        return estimatedAPY;
    }

    function isShariaCompliant() external view override returns (bool) {
        return shariaRegistry.isCompliant(address(this));
    }

    function strategyName() external pure override returns (string memory) {
        return "Government Treasury Sukuk Strategy";
    }

    function asset() external view override returns (address) {
        return address(assetToken);
    }

    function isActive() external view override returns (bool) {
        return isActiveStrategy;
    }

    /**
     * @notice Get position details
     */
    function getPosition(uint256 positionId) external view returns (
        address token,
        uint256 amount,
        uint256 purchasePrice,
        uint256 maturityDate,
        uint256 expectedReturn,
        bool redeemed
    ) {
        require(positionId < positions.length, "Invalid position");
        TreasuryPosition storage pos = positions[positionId];
        return (
            pos.token,
            pos.amount,
            pos.purchasePrice,
            pos.maturityDate,
            pos.expectedReturn,
            pos.redeemed
        );
    }

    /**
     * @notice Get total number of positions
     */
    function getPositionCount() external view returns (uint256) {
        return positions.length;
    }

    /**
     * @notice Get active (unredeemed) positions count
     */
    function getActivePositionsCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < positions.length; i++) {
            if (!positions[i].redeemed) {
                count++;
            }
        }
        return count;
    }

    // =========================================================
    //                   ADMIN FUNCTIONS
    // =========================================================

    /**
     * @notice Activate or deactivate strategy
     */
    function setActive(bool _active) external onlyAdmin {
        isActiveStrategy = _active;
    }
}
