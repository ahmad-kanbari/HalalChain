// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Treasury
 * @notice Main protocol treasury for fee accumulation.
 * @dev Owned by the DAO Timelock.
 */
contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    event FundsWithdrawn(address indexed token, address indexed to, uint256 amount);

    constructor(address _dao) Ownable(_dao) {}

    /**
     * @notice Allow DAO to move funds (e.g. for development grants or liquidity mining).
     */
    function withdraw(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
        emit FundsWithdrawn(token, to, amount);
    }
    
    // Allow receiving ETH
    receive() external payable {}
}
