// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface ISukukManager is IERC1155 {
    enum ProjectStatus { PENDING_SHARIA, FUNDING, ACTIVE, COMPLETED, DEFAULTED }

    struct Project {
        uint256 id;
        string dataHash;
        address issuer;
        uint256 targetRaise;
        uint256 totalRaised;
        uint256 maturity;
        ProjectStatus status;
    }

    event ProjectListed(uint256 indexed id, address issuer, uint256 target);
    event ProjectApproved(uint256 indexed id);
    event Invested(uint256 indexed id, address investor, uint256 amount);
    event YieldDistributed(uint256 indexed id, uint256 amount);

    function listProject(string calldata dataHash, uint256 targetRaise, uint256 maturity) external;
    function approveProject(uint256 id) external;
    function invest(uint256 id, uint256 amount) external;
    function distributeYield(uint256 id, uint256 amount) external;
}
