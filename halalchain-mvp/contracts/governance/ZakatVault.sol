// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../core/AccessControlManager.sol";

/**
 * @title ZakatVault
 * @notice Holds Zakat and Purification funds.
 * @dev Funds here CANNOT be invested. They must be distributed to valid Charities.
 */
contract ZakatVault {
    using SafeERC20 for IERC20;

    AccessControlManager public accessControl;
    
    // Approved Charities
    mapping(address => bool) public isCharity;
    
    event DonationReceived(address indexed donor, address indexed token, uint256 amount);
    event ZakatDistributed(address indexed charity, address indexed token, uint256 amount);

    constructor(address _accessControl) {
        accessControl = AccessControlManager(_accessControl);
    }

    /**
     * @notice Users or Protocols send Zakat here.
     */
    function donate(address token, uint256 amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit DonationReceived(msg.sender, token, amount);
    }

    /**
     * @notice Sharia Board whitelists a charity address.
     */
    function addCharity(address charity) external {
        require(accessControl.hasRole(accessControl.SHARIA_BOARD_ROLE(), msg.sender), "SSB Only");
        isCharity[charity] = true;
    }

    /**
     * @notice Distribute funds to a charity.
     */
    function distribute(address token, address charity, uint256 amount) external {
        // Can be open or restricted. Let's restrict to Admin or Board for now to prevent spam.
        require(
            accessControl.hasRole(accessControl.SHARIA_BOARD_ROLE(), msg.sender) ||
            accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), msg.sender),
            "Auth Only"
        );
        require(isCharity[charity], "Not a valid charity");

        IERC20(token).safeTransfer(charity, amount);
        emit ZakatDistributed(charity, token, amount);
    }
}
