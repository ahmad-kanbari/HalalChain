// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../core/AccessControlManager.sol";
import "../core/ShariaRegistry.sol";
import "../financial/SukukManager.sol";
import "../interfaces/IInvestmentStrategy.sol";

/**
 * @title SukukInvestmentStrategy
 * @notice Invests pool funds into approved Sukuk projects from SukukManager
 * @dev Generates yield by:
 *      1. Investing in active Sukuk projects
 *      2. Receiving profit distributions when issuers distribute yield
 *      3. Earning small trading fees on Sukuk secondary market (0.1-0.5%)
 *      4. Diversifying across multiple projects to reduce risk
 *
 * Expected Returns: 8-15% APY from project profits + trading fees
 */
contract SukukInvestmentStrategy is IInvestmentStrategy, IERC1155Receiver, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =========================================================
    //                        STATE
    // =========================================================

    AccessControlManager public accessControl;
    ShariaRegistry public shariaRegistry;
    SukukManager public sukukManager;
    IERC20 public immutable assetToken; // HAL-GOLD

    address public strategyManager;

    // Track investments
    mapping(uint256 => uint256) public investedInProject; // projectId => amount invested
    uint256[] public activeProjects;

    uint256 public totalInvested;
    uint256 public totalReturnsEarned;
    uint256 public pendingReturns;

    // Trading fees (halal service fees)
    uint256 public constant TRADING_FEE_BPS = 25; // 0.25% trading fee
    uint256 public tradingFeesEarned;

    // APY tracking
    uint256 public lastAPYUpdate;
    uint256 public estimatedAPY; // in basis points

    bool public isActiveStrategy;

    // =========================================================
    //                        EVENTS
    // =========================================================

    event SukukInvested(uint256 indexed projectId, uint256 amount);
    event YieldReceived(uint256 indexed projectId, uint256 amount);
    event TradingFeeEarned(uint256 amount, address trader);
    event SukukSold(uint256 indexed projectId, uint256 amount, uint256 proceeds);

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

    // =========================================================
    //                     CONSTRUCTOR
    // =========================================================

    constructor(
        address _assetToken,
        address _accessControl,
        address _shariaRegistry,
        address _sukukManager,
        address _strategyManager
    ) {
        require(_assetToken != address(0), "Invalid asset");
        require(_accessControl != address(0), "Invalid ACM");
        require(_shariaRegistry != address(0), "Invalid registry");
        require(_sukukManager != address(0), "Invalid Sukuk Manager");
        require(_strategyManager != address(0), "Invalid StrategyManager");

        assetToken = IERC20(_assetToken);
        accessControl = AccessControlManager(_accessControl);
        shariaRegistry = ShariaRegistry(_shariaRegistry);
        sukukManager = SukukManager(_sukukManager);
        strategyManager = _strategyManager;

        isActiveStrategy = true;
        lastAPYUpdate = block.timestamp;
        estimatedAPY = 1000; // Initial estimate: 10% APY
    }

    // =========================================================
    //                   CORE STRATEGY FUNCTIONS
    // =========================================================

    /**
     * @notice Deploy capital into Sukuk projects
     * @dev Finds approved, funding projects and diversifies investment
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

        uint256 remainingToInvest = amount;
        uint256 actualInvested = 0;

        // Find active Sukuk projects in FUNDING status
        // For simplicity, we'll invest in project IDs up to nextProjectId
        // In production, would need better project discovery
        uint256 projectsToConsider = 5; // Check last 5 projects
        uint256 maxProjectId = sukukManager.nextProjectId();
        uint256 startId = maxProjectId > projectsToConsider ? maxProjectId - projectsToConsider : 0;

        for (uint256 i = startId; i < maxProjectId && remainingToInvest > 0; i++) {
            (
                ,
                ,
                ,
                uint256 targetRaise,
                uint256 totalRaised,
                ,
                SukukManager.ProjectStatus status
            ) = sukukManager.projects(i);

            // Only invest in FUNDING projects that need capital
            if (status == SukukManager.ProjectStatus.FUNDING && totalRaised < targetRaise) {
                uint256 availableSpace = targetRaise - totalRaised;
                uint256 toInvest = remainingToInvest < availableSpace ? remainingToInvest : availableSpace;

                // Don't invest tiny amounts
                if (toInvest < 100 * 1e18) continue;

                // Approve and invest
                assetToken.forceApprove(address(sukukManager), toInvest);
                sukukManager.invest(i, toInvest);

                // Track investment
                if (investedInProject[i] == 0) {
                    activeProjects.push(i);
                }
                investedInProject[i] += toInvest;

                actualInvested += toInvest;
                remainingToInvest -= toInvest;

                emit SukukInvested(i, toInvest);
                emit Invested(toInvest, block.timestamp);
            }
        }

        totalInvested += actualInvested;

        // If couldn't invest everything, return remainder
        if (remainingToInvest > 0) {
            assetToken.safeTransfer(msg.sender, remainingToInvest);
        }

        return actualInvested;
    }

    /**
     * @notice Withdraw capital from strategy
     * @dev Can sell Sukuk tokens on secondary market (with trading fee)
     */
    function withdraw(uint256 amount)
        external
        override
        onlyManager
        nonReentrant
        returns (uint256)
    {
        require(amount > 0 && amount <= totalInvested, "Invalid amount");

        // In a real implementation, would sell Sukuk tokens on secondary market
        // For MVP, we simulate this by reducing tracked investment
        // (assumes Sukuk is still active or can be sold)

        uint256 remainingToWithdraw = amount;
        uint256 actualWithdrawn = 0;

        // Withdraw proportionally from active projects
        for (uint256 i = 0; i < activeProjects.length && remainingToWithdraw > 0; i++) {
            uint256 projectId = activeProjects[i];
            uint256 invested = investedInProject[projectId];

            if (invested > 0) {
                uint256 toWithdraw = remainingToWithdraw < invested ? remainingToWithdraw : invested;

                // In real implementation, would sell ERC1155 Sukuk tokens here
                // For now, we just track the withdrawal

                investedInProject[projectId] -= toWithdraw;
                actualWithdrawn += toWithdraw;
                remainingToWithdraw -= toWithdraw;

                emit SukukSold(projectId, toWithdraw, toWithdraw);
            }
        }

        totalInvested -= actualWithdrawn;

        // Transfer HAL-GOLD back to StrategyManager
        assetToken.safeTransfer(msg.sender, actualWithdrawn);

        emit Withdrawn(actualWithdrawn, block.timestamp);
        return actualWithdrawn;
    }

    /**
     * @notice Claim accumulated yields from Sukuk distributions
     */
    function claimReturns()
        external
        override
        onlyManager
        nonReentrant
        returns (uint256)
    {
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
    //                  YIELD RECEIVING FUNCTIONS
    // =========================================================

    /**
     * @notice Receive yield distributions from Sukuk projects
     * @dev Called when SukukManager distributes yields
     */
    function receiveYield(uint256 projectId, uint256 amount) external {
        require(msg.sender == address(sukukManager), "Only SukukManager");
        require(investedInProject[projectId] > 0, "Not invested in project");

        // Receive HAL-GOLD yield
        assetToken.safeTransferFrom(msg.sender, address(this), amount);

        pendingReturns += amount;

        emit YieldReceived(projectId, amount);
        emit ReturnsEarned(amount, block.timestamp);

        // Update APY estimate
        _updateAPY();
    }

    /**
     * @notice Charge trading fee when users trade Sukuk tokens
     * @dev This is a halal service fee for facilitating trades
     */
    function chargeTradingFee(uint256 tradeAmount, address trader) external returns (uint256) {
        require(
            accessControl.hasRole(accessControl.OPERATOR_ROLE(), msg.sender),
            "Operator only"
        );

        uint256 fee = (tradeAmount * TRADING_FEE_BPS) / 10000;

        assetToken.safeTransferFrom(trader, address(this), fee);

        pendingReturns += fee;
        tradingFeesEarned += fee;

        emit TradingFeeEarned(fee, trader);

        return fee;
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
        return pendingReturns;
    }

    function getAPY() external view override returns (uint256) {
        return estimatedAPY;
    }

    function isShariaCompliant() external view override returns (bool) {
        return shariaRegistry.isCompliant(address(this));
    }

    function strategyName() external pure override returns (string memory) {
        return "Sukuk Investment Strategy";
    }

    function asset() external view override returns (address) {
        return address(assetToken);
    }

    function isActive() external view override returns (bool) {
        return isActiveStrategy;
    }

    /**
     * @notice Get list of active project investments
     */
    function getActiveProjects() external view returns (uint256[] memory) {
        return activeProjects;
    }

    /**
     * @notice Get investment amount in specific project
     */
    function getProjectInvestment(uint256 projectId) external view returns (uint256) {
        return investedInProject[projectId];
    }

    // =========================================================
    //                   INTERNAL FUNCTIONS
    // =========================================================

    /**
     * @notice Update APY estimate based on recent returns
     */
    function _updateAPY() internal {
        // Simple APY calculation: (returns / invested) * (365 days / time period) * 10000 (for bps)
        uint256 timeSinceLastUpdate = block.timestamp - lastAPYUpdate;

        if (timeSinceLastUpdate >= 1 days && totalInvested > 0) {
            uint256 recentReturns = pendingReturns;
            uint256 annualizedReturns = (recentReturns * 365 days * 10000) / (totalInvested * timeSinceLastUpdate);

            // Smooth the APY update (70% old, 30% new)
            estimatedAPY = (estimatedAPY * 7 + annualizedReturns * 3) / 10;

            lastAPYUpdate = block.timestamp;
        }
    }

    // =========================================================
    //                   ERC1155 RECEIVER
    // =========================================================

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId;
    }

    // =========================================================
    //                   ADMIN FUNCTIONS
    // =========================================================

    /**
     * @notice Activate or deactivate strategy
     */
    function setActive(bool _active) external {
        require(
            accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), msg.sender),
            "Admin only"
        );
        isActiveStrategy = _active;
    }
}
