// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "../core/AccessControlManager.sol";

/**
 * @title HalalToken (HALAL)
 * @notice Governance token for the HalalChain DAO.
 * @dev Used for voting on protocol parameters and Sharia Board elections.
 *      Strictly Utility/Governance. No rebase/reflection mechanics (Riba-like).
 */
contract HalalToken is ERC20Votes, ERC20Permit {
    
    AccessControlManager public accessControl;

    constructor(address _accessControl) 
        ERC20("HalalChain Governance", "HALAL") 
        ERC20Permit("HalalChain Governance") 
    {
        require(_accessControl != address(0), "Invalid ACM");
        accessControl = AccessControlManager(_accessControl);
        
        // Initial Supply to Treasury/TimeLock (placeholder logic)
        _mint(msg.sender, 1_000_000_000 * 1e18);
    }

    // Required overrides for ERC20Votes
    function _update(address from, address to, uint256 value) internal override(ERC20Votes, ERC20) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
