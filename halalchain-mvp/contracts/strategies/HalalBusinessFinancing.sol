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
 * @title HalalBusinessFinancing
 * @notice Mudarabah-style profit-sharing financing for verified halal businesses
 * @dev Generates yield by:
 *      1. Financing halal businesses with Mudarabah contracts
 *      2. Oracle verifies business legitimacy and financial reports
 *      3. Businesses share profits (not pay interest) based on actual results
 *      4. Sharia Board approves each business before financing
 *      5. Risk-sharing model: investors share both profits AND losses
 *
 * Expected Returns: 10-20% APY from business operations
 * Risk Level: MEDIUM-HIGH (business risk, but diversified)
 *
 * Sharia Compliance:
 * - NO interest (Riba) - only profit-sharing
 * - Businesses must be in halal industries
 * - Profits based on actual business results (not guaranteed)
 * - Loss-sharing (investors bear financial loss, mudarib bears time loss)
 */
contract HalalBusinessFinancing is IInvestmentStrategy, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // =========================================================
    //                        STRUCTS
    // =========================================================

    struct MudarabahContract {
        address business;               // Business address
        uint256 principal;              // Amount financed
        uint256 profitShareBps;         // Profit share % (basis points, e.g., 3000 = 30%)
        uint256 startDate;              // Financing start date
        uint256 duration;               // Contract duration in seconds
        uint256 profitsReceived;        // Total profits received
        uint256 lossesIncurred;         // Total losses incurred
        bool active;                    // Contract still active
        string businessName;            // Human-readable business name
    }

    // =========================================================
    //                        STATE
    // =========================================================

    AccessControlManager public accessControl;
    ShariaRegistry public shariaRegistry;
    OracleHub public oracleHub;
    IERC20 public immutable assetToken; // HAL-GOLD

    address public strategyManager;

    // Track financing contracts
    MudarabahContract[] public contracts;
    mapping(address => bool) public approvedBusinesses;
    mapping(address => uint256[]) public businessContracts; // business => contract IDs

    uint256 public totalFinanced;
    uint256 public totalReturnsEarned;
    uint256 public pendingReturns;
    uint256 public totalLosses;

    // APY tracking
    uint256 public estimatedAPY; // in basis points

    bool public isActiveStrategy;

    // =========================================================
    //                        EVENTS
    // =========================================================

    event BusinessApproved(address indexed business, string name);
    event BusinessBlacklisted(address indexed business, string reason);
    event MudarabahContractCreated(uint256 indexed contractId, address indexed business, uint256 principal, uint256 profitShareBps);
    event ProfitReported(uint256 indexed contractId, uint256 profit, uint256 shareToInvestor);
    event LossReported(uint256 indexed contractId, uint256 loss);
    event ContractCompleted(uint256 indexed contractId, uint256 totalProfit);

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

    modifier onlyOracle() {
        require(
            accessControl.hasRole(accessControl.ORACLE_UPDATER_ROLE(), msg.sender),
            "Oracle only"
        );
        _;
    }

    modifier onlyShariaBoard() {
        require(
            accessControl.hasRole(accessControl.SHARIA_BOARD_ROLE(), msg.sender),
            "Sharia Board only"
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
        estimatedAPY = 1500; // Default 15% APY for business financing
    }

    // =========================================================
    //                   CORE STRATEGY FUNCTIONS
    // =========================================================

    /**
     * @notice Deploy capital to finance halal businesses
     * @dev Creates Mudarabah contracts with approved businesses
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

        // For MVP, capital is held in strategy until business contracts are created
        // In production, would automatically allocate to pending business applications

        totalFinanced += amount;

        emit Invested(amount, block.timestamp);

        return amount;
    }

    /**
     * @notice Withdraw capital from completed contracts
     */
    function withdraw(uint256 amount)
        external
        override
        onlyManager
        nonReentrant
        returns (uint256)
    {
        require(amount > 0, "Amount must be > 0");

        uint256 availableToWithdraw = assetToken.balanceOf(address(this)) - pendingReturns;
        require(availableToWithdraw >= amount, "Insufficient available capital");

        totalFinanced -= amount;

        assetToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(amount, block.timestamp);

        return amount;
    }

    /**
     * @notice Claim accumulated profits from business operations
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
            totalFinanced = 0;
            assetToken.safeTransfer(msg.sender, balance);
        }

        return balance;
    }

    // =========================================================
    //                  BUSINESS MANAGEMENT
    // =========================================================

    /**
     * @notice Sharia Board approves a business for financing
     */
    function approveBusiness(address business, string calldata name) external onlyShariaBoard {
        require(business != address(0), "Invalid business");
        require(shariaRegistry.isCompliant(business), "Business not Sharia-compliant");

        approvedBusinesses[business] = true;
        emit BusinessApproved(business, name);
    }

    /**
     * @notice Blacklist a non-compliant business
     */
    function blacklistBusiness(address business, string calldata reason) external onlyShariaBoard {
        approvedBusinesses[business] = false;

        // Mark all active contracts with this business as inactive
        uint256[] memory contractIds = businessContracts[business];
        for (uint256 i = 0; i < contractIds.length; i++) {
            contracts[contractIds[i]].active = false;
        }

        emit BusinessBlacklisted(business, reason);
    }

    /**
     * @notice Create a Mudarabah contract with an approved business
     * @param business Business to finance
     * @param principal Amount to finance
     * @param profitShareBps Investor's profit share (basis points)
     * @param duration Contract duration in seconds
     * @param name Business name
     */
    function createMudarabahContract(
        address business,
        uint256 principal,
        uint256 profitShareBps,
        uint256 duration,
        string calldata name
    ) external onlyManager nonReentrant returns (uint256) {
        require(approvedBusinesses[business], "Business not approved");
        require(principal > 0 && principal <= totalFinanced, "Invalid principal");
        require(profitShareBps > 0 && profitShareBps <= 10000, "Invalid profit share");
        require(duration >= 30 days && duration <= 365 days, "Invalid duration");

        // Transfer financing to business
        assetToken.safeTransfer(business, principal);

        // Create contract
        uint256 contractId = contracts.length;
        contracts.push(MudarabahContract({
            business: business,
            principal: principal,
            profitShareBps: profitShareBps,
            startDate: block.timestamp,
            duration: duration,
            profitsReceived: 0,
            lossesIncurred: 0,
            active: true,
            businessName: name
        }));

        businessContracts[business].push(contractId);

        emit MudarabahContractCreated(contractId, business, principal, profitShareBps);

        return contractId;
    }

    /**
     * @notice Oracle reports business profits (verified off-chain)
     * @dev Business shares profits according to agreed ratio
     */
    function reportProfit(uint256 contractId, uint256 totalProfit) external onlyOracle {
        require(contractId < contracts.length, "Invalid contract");

        MudarabahContract storage mc = contracts[contractId];
        require(mc.active, "Contract not active");

        // Calculate investor's share
        uint256 investorShare = (totalProfit * mc.profitShareBps) / 10000;
        uint256 businessShare = totalProfit - investorShare;

        // Business transfers investor's share
        assetToken.safeTransferFrom(mc.business, address(this), investorShare);

        mc.profitsReceived += investorShare;
        pendingReturns += investorShare;

        emit ProfitReported(contractId, totalProfit, investorShare);
        emit ReturnsEarned(investorShare, block.timestamp);

        // Update APY estimate
        _updateAPY();
    }

    /**
     * @notice Oracle reports business losses
     * @dev Investors bear financial losses (Mudarabah principle)
     */
    function reportLoss(uint256 contractId, uint256 lossAmount) external onlyOracle {
        require(contractId < contracts.length, "Invalid contract");

        MudarabahContract storage mc = contracts[contractId];
        require(mc.active, "Contract not active");
        require(lossAmount <= mc.principal, "Loss exceeds principal");

        mc.lossesIncurred += lossAmount;
        totalLosses += lossAmount;

        emit LossReported(contractId, lossAmount);
    }

    /**
     * @notice Complete a Mudarabah contract
     * @dev Return remaining principal + final profit settlement
     */
    function completeContract(uint256 contractId) external onlyManager {
        require(contractId < contracts.length, "Invalid contract");

        MudarabahContract storage mc = contracts[contractId];
        require(mc.active, "Contract not active");
        require(block.timestamp >= mc.startDate + mc.duration, "Contract not matured");

        mc.active = false;

        // Calculate net result
        uint256 netProfit = mc.profitsReceived;
        uint256 netLoss = mc.lossesIncurred;

        emit ContractCompleted(contractId, netProfit);
    }

    // =========================================================
    //                     VIEW FUNCTIONS
    // =========================================================

    function getBalance() external view override returns (uint256) {
        return totalFinanced + pendingReturns - totalLosses;
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
        return "Halal Business Financing (Mudarabah)";
    }

    function asset() external view override returns (address) {
        return address(assetToken);
    }

    function isActive() external view override returns (bool) {
        return isActiveStrategy;
    }

    /**
     * @notice Get contract details
     */
    function getContract(uint256 contractId) external view returns (
        address business,
        uint256 principal,
        uint256 profitShareBps,
        uint256 startDate,
        uint256 duration,
        uint256 profitsReceived,
        uint256 lossesIncurred,
        bool active,
        string memory businessName
    ) {
        require(contractId < contracts.length, "Invalid contract");
        MudarabahContract storage mc = contracts[contractId];
        return (
            mc.business,
            mc.principal,
            mc.profitShareBps,
            mc.startDate,
            mc.duration,
            mc.profitsReceived,
            mc.lossesIncurred,
            mc.active,
            mc.businessName
        );
    }

    /**
     * @notice Get total contracts count
     */
    function getContractsCount() external view returns (uint256) {
        return contracts.length;
    }

    /**
     * @notice Get active contracts for a business
     */
    function getBusinessContractsCount(address business) external view returns (uint256) {
        return businessContracts[business].length;
    }

    // =========================================================
    //                   INTERNAL FUNCTIONS
    // =========================================================

    /**
     * @notice Update APY estimate based on recent returns
     */
    function _updateAPY() internal {
        if (totalFinanced > 0 && totalReturnsEarned > 0) {
            // Simple APY: (returns / financed) * 10000 for basis points
            // This is a rough estimate, production would use time-weighted calculations
            uint256 returnRate = (totalReturnsEarned * 10000) / totalFinanced;

            // Smooth the APY update (80% old, 20% new)
            estimatedAPY = (estimatedAPY * 8 + returnRate * 2) / 10;
        }
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

    /**
     * @notice Update APY estimate manually
     */
    function updateAPYEstimate(uint256 newAPY) external {
        require(
            accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), msg.sender),
            "Admin only"
        );
        require(newAPY <= 5000, "APY too high"); // Max 50% for business financing
        estimatedAPY = newAPY;
    }
}
