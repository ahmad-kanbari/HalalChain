// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./AccessControlManager.sol";

/**
 * @title ShariaRegistry
 * @notice The "Source of Truth" for Halal Compliance.
 * @dev Only the Sharia Board can approve/revoke assets or contracts here.
 *      Financial contracts MUST verify compliance against this registry.
 */
contract ShariaRegistry {
    
    // =========================================================
    //                        STATE
    // =========================================================

    AccessControlManager public immutable accessControl;

    /// @notice Fatwa metadata structure
    struct Fatwa {
        string ipfsHash;    // Link to signed PDF ruling
        uint256 issuedAt;   // Timestamp
        address[] signers;  // Scholars who signed
        bool isValid;       // Active status
    }

    /// @notice Mapping from Contract/Asset Address -> Compliance Status
    mapping(address => bool) public isHalal;

    /// @notice Mapping from Contract Address -> Fatwa Details
    mapping(address => Fatwa) public contractFatwas;

    // =========================================================
    //                        EVENTS
    // =========================================================

    event ComplianceStatusChanged(address indexed target, bool status, string reasoning);
    event FatwaRegistered(address indexed target, string ipfsHash);

    // =========================================================
    //                       MODIFIERS
    // =========================================================

    modifier onlyShariaBoard() {
        require(
            accessControl.hasRole(accessControl.SHARIA_BOARD_ROLE(), msg.sender), 
            "Caller is not Sharia Board"
        );
        _;
    }

    // =========================================================
    //                      FUNCTIONS
    // =========================================================

    constructor(address _accessControl) {
        require(_accessControl != address(0), "Invalid ACM");
        accessControl = AccessControlManager(_accessControl);
    }

    /**
     * @notice Registers a Fatwa and whitelists a contract/asset.
     * @dev Only callable by SHARIA_BOARD_ROLE.
     * @param target The contract address to approve.
     * @param ipfsHash The IPFS hash of the PDF ruling.
     * @param signers Array of scholar addresses who audit-signed.
     */
    function registerFatwa(
        address target, 
        string calldata ipfsHash, 
        address[] calldata signers
    ) external onlyShariaBoard {
        require(target != address(0), "Invalid address");
        
        // 1. Store Fatwa
        contractFatwas[target] = Fatwa({
            ipfsHash: ipfsHash,
            issuedAt: block.timestamp,
            signers: signers,
            isValid: true
        });

        // 2. Set Compliance to True
        isHalal[target] = true;

        emit FatwaRegistered(target, ipfsHash);
        emit ComplianceStatusChanged(target, true, "Fatwa Issued");
    }

    /**
     * @notice Revokes Halal status (e.g., if a project defaults or turns Haram).
     * @param target The address to blacklist.
     * @param reasoning Why it was revoked.
     */
    function revokeStatus(address target, string calldata reasoning) external onlyShariaBoard {
        isHalal[target] = false;
        // Invalidate fatwa
        contractFatwas[target].isValid = false;
        
        emit ComplianceStatusChanged(target, false, reasoning);
    }

    /**
     * @notice Global check for system contracts to verify partial compliance.
     */
    function isCompliant(address target) external view returns (bool) {
        return isHalal[target];
    }
}
