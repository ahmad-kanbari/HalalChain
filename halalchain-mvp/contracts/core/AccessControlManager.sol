// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

/**
 * @title AccessControlManager
 * @notice Centralized Role-Based Access Control for HalalChain.
 * @dev Manages permissions for Sharia Boards, Auditors, and System Admins.
 *      Uses AccessControlEnumerable for role enumeration.
 */
contract AccessControlManager is AccessControlEnumerable {
    
    // =========================================================
    //                            ROLES
    // =========================================================

    /// @notice The Sharia Supervisory Board (SSB).
    /// @dev Has power to Whitelist/Blacklist assets and Veto proposals.
    /// @custom:sharia Must consist of qualified Islamic scholars.
    bytes32 public constant SHARIA_BOARD_ROLE = keccak256("SHARIA_BOARD_ROLE");

    /// @notice Operational Admin (Tech Team / DAO).
    /// @dev Can configure technical parameters (timelocks, fees).
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /// @notice Mudarib (Fund Manager) Role.
    /// @dev Allowed to manage capital in Mudarabah Pools.
    bytes32 public constant MUDARIB_ROLE = keccak256("MUDARIB_ROLE");

    /// @notice Oracle Updater Role.
    /// @dev Allowed to push Gold Reserve proofs and Price Feeds.
    bytes32 public constant ORACLE_UPDATER_ROLE = keccak256("ORACLE_UPDATER_ROLE");

    /// @notice Financial Auditor Role.
    /// @dev Can trigger paused states or flag suspicious activity.
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // =========================================================
    //                         EVENTS
    // =========================================================
    
    event RoleSetupCompleted(address indexed admin);

    // =========================================================
    //                       CONSTRUCTOR
    // =========================================================

    /**
     * @notice Initializes the contract and sets the deployer as Default Admin.
     * @param _shariaBoard The initial address of the Sharia Board Multisig.
     */
    constructor(address _shariaBoard) {
        require(_shariaBoard != address(0), "Invalid Sharia Board address");

        // Grant Default Admin Role to Deployer (usually a Timelock DAO later)
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // Setup initial Sharia Board
        _grantRole(SHARIA_BOARD_ROLE, _shariaBoard);

        emit RoleSetupCompleted(msg.sender);
    }

    /**
     * @notice Checks if an address is strictly a Sharia Board member.
     */
    function isShariaBoard(address account) external view returns (bool) {
        return hasRole(SHARIA_BOARD_ROLE, account);
    }

    /**
     * @notice Checks if an address is an approved Mudarib (Manager).
     */
    function isMudarib(address account) external view returns (bool) {
        return hasRole(MUDARIB_ROLE, account);
    }
}
