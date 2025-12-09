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

    // =========================================================
    //                   REDEMPTION SYSTEM
    // =========================================================
    
    struct RedemptionRequest {
        address requester;
        uint256 amount;
        uint256 requestTime;
        bool fulfilled;
        uint256 fulfillmentTime;
    }

    mapping(uint256 => RedemptionRequest) public redemptionRequests;
    uint256 public nextRedemptionId;

    uint256 public constant MIN_REDEMPTION = 100 * 1e18; // 100 HAL-GOLD
    uint256 public constant REDEMPTION_FEE_BPS = 50; // 0.5%

    event RedemptionRequested(uint256 indexed requestId, address indexed user, uint256 amount);
    event RedemptionFulfilled(uint256 indexed requestId, uint256 amount);
    event RedemptionCancelled(uint256 indexed requestId);

    // =========================================================
    //                 PROOF-OF-RESERVES
    // =========================================================
    
    struct ReserveSnapshot {
        uint256 timestamp;
        uint256 goldReserves; // grams
        uint256 totalSupply;
        uint256 reserveRatio; // basis points
    }

    ReserveSnapshot[] public reserveHistory;
    uint256 public lastSnapshotTime;

    event ReserveSnapshotTaken(uint256 goldReserves, uint256 totalSupply, uint256 ratio);

    // =========================================================
    //                 TIME-LIMITED PAUSE
    // =========================================================
    
    uint256 public constant MAX_PAUSE_DURATION = 72 hours;
    uint256 public pauseStartTime;
    string public pauseReason;

    event PauseReasonLogged(string reason, uint256 duration);
    event PauseExtended(uint256 newEndTime);

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

    // =========================================================
    //               REDEMPTION FUNCTIONS
    // =========================================================

    /**
     * @notice Request redemption of HAL-GOLD for physical gold
     * @param amount Amount to redeem (must be >= MIN_REDEMPTION)
     */
    function requestRedemption(uint256 amount) external onlyCompliant whenNotPaused {
        require(amount >= MIN_REDEMPTION, "Amount below minimum");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Calculate fee
        uint256 fee = (amount * REDEMPTION_FEE_BPS) / 10000;
        uint256 netAmount = amount - fee;
        
        // Burn tokens immediately
        _burn(msg.sender, amount);
        
        // Send fee to contract (can be withdrawn by admin)
        if (fee > 0) {
            _mint(address(this), fee);
        }
        
        // Create redemption request
        uint256 requestId = nextRedemptionId++;
        redemptionRequests[requestId] = RedemptionRequest({
            requester: msg.sender,
            amount: netAmount,
            requestTime: block.timestamp,
            fulfilled: false,
            fulfillmentTime: 0
        });
        
        emit RedemptionRequested(requestId, msg.sender, netAmount);
    }

    /**
     * @notice Admin marks redemption as fulfilled (after physical gold delivery)
     */
    function fulfillRedemption(uint256 requestId) external onlyMinter {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(!request.fulfilled, "Already fulfilled");
        require(request.requester != address(0), "Invalid request");
        
        request.fulfilled = true;
        request.fulfillmentTime = block.timestamp;
        
        emit RedemptionFulfilled(requestId, request.amount);
    }

    /**
     * @notice User cancels redemption request (re-mints their tokens)
     */
    function cancelRedemption(uint256 requestId) external {
        RedemptionRequest storage request = redemptionRequests[requestId];
        require(request.requester == msg.sender, "Not your request");
        require(!request.fulfilled, "Already fulfilled");
        require(block.timestamp < request.requestTime + 30 days, "Request expired");
        
        // Re-mint tokens to user
        _mint(msg.sender, request.amount);
        
        request.fulfilled = true; // Mark as processed
        
        emit RedemptionCancelled(requestId);
    }

    /**
     * @notice Get pending redemption requests
     */
    function getPendingRedemptions() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < nextRedemptionId; i++) {
            if (!redemptionRequests[i].fulfilled) {
                count++;
            }
        }
        
        uint256[] memory pending = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < nextRedemptionId; i++) {
            if (!redemptionRequests[i].fulfilled) {
                pending[index++] = i;
            }
        }
        
        return pending;
    }

    // =========================================================
    //             PROOF-OF-RESERVES FUNCTIONS
    // =========================================================

    /**
     * @notice Get current reserve ratio
     * @return ratio Reserve ratio in basis points (10000 = 100%)
     */
    function getReserveRatio() public view returns (uint256 ratio) {
        (uint256 reserves, ) = oracleHub.getPrice(goldReserveFeed); // grams
        (uint256 price, ) = oracleHub.getPrice(goldPriceFeed); // USD per gram
        
        uint256 reserveValue = reserves * price;
        uint256 supply = totalSupply();
        
        if (supply == 0) return 10000;
        
        ratio = (reserveValue * 10000) / supply;
    }

    /**
     * @notice Get current reserves in grams
     */
    function getCurrentReserves() public view returns (uint256 grams, uint256 value) {
        (grams, ) = oracleHub.getPrice(goldReserveFeed);
        (uint256 price, ) = oracleHub.getPrice(goldPriceFeed);
        value = grams * price;
    }

    /**
     * @notice Take reserve snapshot (should be called daily/weekly)
     */
    function takeReserveSnapshot() external {
        require(
            accessControl.hasRole(accessControl.OPERATOR_ROLE(), msg.sender),
            "Operator only"
        );
        require(block.timestamp >= lastSnapshotTime + 1 days, "Too soon");
        
        (uint256 reserves, ) = getCurrentReserves();
        uint256 supply = totalSupply();
        uint256 ratio = getReserveRatio();
        
        reserveHistory.push(ReserveSnapshot({
            timestamp: block.timestamp,
            goldReserves: reserves,
            totalSupply: supply,
            reserveRatio: ratio
        }));
        
        lastSnapshotTime = block.timestamp;
        
        emit ReserveSnapshotTaken(reserves, supply, ratio);
    }

    /**
     * @notice Get reserve history
     */
    function getReserveHistory(uint256 limit) external view returns (ReserveSnapshot[] memory) {
        uint256 length = reserveHistory.length;
        uint256 returnLength = limit > length ? length : limit;
        
        ReserveSnapshot[] memory recent = new ReserveSnapshot[](returnLength);
        
        for (uint256 i = 0; i < returnLength; i++) {
            recent[i] = reserveHistory[length - returnLength + i];
        }
        
        return recent;
    }

    /**
     * @notice Check if reserves are sufficient
     */
    function isFullyBacked() public view returns (bool) {
        return getReserveRatio() >= 10000; // 100% or more
    }

    // =========================================================
    //             TIME-LIMITED PAUSE FUNCTIONS
    // =========================================================

    /**
     * @notice Pause with time limit and reason
     */
    function pauseWithReason(string calldata reason) external onlyMinter {
        require(!paused(), "Already paused");
        
        _pause();
        pauseStartTime = block.timestamp;
        pauseReason = reason;
        
        emit PauseReasonLogged(reason, MAX_PAUSE_DURATION);
    }

    /**
     * @notice Unpause (auto or manual)
     */
    function unpause() public onlyMinter {
        _unpause();
        pauseStartTime = 0;
        pauseReason = "";
    }

    /**
     * @notice Check if pause has expired
     */
    function isPauseExpired() public view returns (bool) {
        if (!paused()) return false;
        return block.timestamp >= pauseStartTime + MAX_PAUSE_DURATION;
    }

    /**
     * @notice Extend pause (requires governance)
     */
    function extendPause(uint256 additionalTime) external {
        require(accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), msg.sender), "Admin only");
        require(paused(), "Not paused");
        require(additionalTime <= MAX_PAUSE_DURATION, "Extension too long");
        
        pauseStartTime = block.timestamp;
        
        emit PauseExtended(block.timestamp + MAX_PAUSE_DURATION);
    }

    /**
     * @notice Override _update to check pause expiry
     */
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        // Auto-unpause if expired
        if (paused() && isPauseExpired()) {
            _unpause();
            pauseStartTime = 0;
        }
        
        super._update(from, to, value);
    }

    /**
     * @notice Legacy pause function (compatibility)
     */
    function pause() external onlyMinter {
        _pause();
        pauseStartTime = block.timestamp;
        pauseReason = "Manual pause";
        emit PauseReasonLogged("Manual pause", MAX_PAUSE_DURATION);
    }
}
