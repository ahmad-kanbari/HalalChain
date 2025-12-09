// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IShariaRegistry {
    event ComplianceStatusChanged(address indexed target, bool status, string reasoning);
    event FatwaRegistered(address indexed target, string ipfsHash);

    function registerFatwa(address target, string calldata ipfsHash, address[] calldata signers) external;
    function revokeStatus(address target, string calldata reasoning) external;
    function isCompliant(address target) external view returns (bool);
}
