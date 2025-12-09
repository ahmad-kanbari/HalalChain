// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "../core/AccessControlManager.sol";

/**
 * @title HalalToken (HALAL)
 * @notice Governance token for the HalalChain DAO.
 * @dev Used for voting on protocol parameters and Sharia Board elections.
 *      Strictly Utility/Governance. No rebase/reflection mechanics (Riba-like).
 */
contract HalalToken is ERC20Votes, ERC20Permit, ERC20Burnable, ERC20Pausable {

    AccessControlManager public accessControl;

    constructor(address _accessControl)
        ERC20("HalalChain", "HALAL")
        ERC20Permit("HalalChain")
    {
        require(_accessControl != address(0), "Invalid ACM");
        accessControl = AccessControlManager(_accessControl);

        // Initial Supply to Treasury/TimeLock (placeholder logic)
        _mint(msg.sender, 1_000_000_000 * 1e18);
    }

    modifier onlyAdmin() {
        require(accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), msg.sender), "AccessControlUnauthorizedAccount");
        _;
    }

    function pause() external onlyAdmin {
        _pause();
    }

    function unpause() external onlyAdmin {
        _unpause();
    }

    // Required overrides for ERC20Votes + ERC20Pausable
    function _update(address from, address to, uint256 value) internal override(ERC20Votes, ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
