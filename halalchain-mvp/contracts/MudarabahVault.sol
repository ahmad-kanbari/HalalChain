// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MudarabahVault is Ownable, ReentrancyGuard {
    IERC20 public immutable asset; // HAL-GOLD
    
    uint256 public constant MANAGEMENT_FEE = 20; // 20% of profits

    // Tracking shares is better than tracking raw amounts for profit distribution
    // Share Price = Total Assets / Total Shares
    uint256 public totalShares;
    mapping(address => uint256) public shares;

    event Deposit(address indexed user, uint256 amount, uint256 sharesMinted);
    event Withdraw(address indexed user, uint256 amount, uint256 sharesBurned);
    event ProfitAdded(uint256 amount, uint256 feeTaken);

    constructor(address _asset) Ownable(msg.sender) {
        asset = IERC20(_asset);
    }

    // Helper to calculate total managed assets (excluding pending profits not yet realized?) 
    // For this simple model, total assets = balance of this contract.
    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");

        uint256 currentTotalAssets = totalAssets();
        uint256 newShares;

        if (totalShares == 0 || currentTotalAssets == 0) {
            newShares = amount;
        } else {
            // Calculate shares based on current value
            // shares = (amount * totalShares) / null? 
            // Wait, if assets are in the contract, they include profit?
            // Yes.
            newShares = (amount * totalShares) / currentTotalAssets;
        }

        asset.transferFrom(msg.sender, address(this), amount);
        
        shares[msg.sender] += newShares;
        totalShares += newShares;

        emit Deposit(msg.sender, amount, newShares);
    }

    function withdraw(uint256 shareAmount) external nonReentrant {
        require(shareAmount > 0, "Amount must be > 0");
        require(shares[msg.sender] >= shareAmount, "Insufficient shares");

        uint256 currentTotalAssets = totalAssets();
        
        // Calculate amount to return
        uint256 amountToReturn = (shareAmount * currentTotalAssets) / totalShares;

        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;

        asset.transfer(msg.sender, amountToReturn);

        emit Withdraw(msg.sender, amountToReturn, shareAmount);
    }

    // Simulate profit generation
    // In real life, funds would move to strategies. 
    // Here, we simulate "Admin adds profit" by depositing more HAL-GOLD?
    // Or just sending tokens to the contract?
    // If admin sends tokens, `totalAssets()` increases, so share price increases automatically.
    // However, we need to take the Management Fee from the *profit*.
    
    function distributeProfit(uint256 profitAmount) external nonReentrant {
        require(profitAmount > 0, "Profit must be > 0");
        
        // Admin must approve transfer first
        asset.transferFrom(msg.sender, address(this), profitAmount);
        
        // Calculate fee
        uint256 fee = (profitAmount * MANAGEMENT_FEE) / 100;
        uint256 netProfit = profitAmount - fee;
        
        // Send fee to owner (DAO treasury)
        asset.transfer(owner(), fee);
        
        // netProfit stays in contract, increasing price per share
        
        emit ProfitAdded(netProfit, fee);
    }
}
