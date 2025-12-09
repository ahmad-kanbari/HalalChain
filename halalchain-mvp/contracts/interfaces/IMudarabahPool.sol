// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/interfaces/IERC4626.sol";

interface IMudarabahPool is IERC4626 {
    event ProfitRealized(uint256 totalEth, uint256 netToPool, uint256 feeToManager);
    event CapitalDeployed(address indexed target, uint256 amount);
    
    function deployCapital(address target, uint256 amount) external;
    function realizeProfit(uint256 profitAmount) external;
    function allowTarget(address target, bool status) external;
}
