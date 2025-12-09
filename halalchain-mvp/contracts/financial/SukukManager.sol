// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../core/AccessControlManager.sol";
import "../core/ShariaRegistry.sol";

/**
 * @title SukukManager
 * @notice Originating and managing Asset-Backed Sukuk (Project Tokens).
 * @dev Uses ERC1155. Each ID represents a distinct Project/Sukuk.
 *      Flow: List -> Sharia Review -> Funding -> Active -> Completed.
 */
contract SukukManager is ERC1155, ReentrancyGuard {
    using SafeERC20 for IERC20;

    AccessControlManager public accessControl;
    ShariaRegistry public shariaRegistry;
    IERC20 public paymentToken; // e.g., H-GOLD

    enum ProjectStatus { PENDING_SHARIA, FUNDING, ACTIVE, COMPLETED, DEFAULTED }

    struct Project {
        uint256 id;
        string dataHash;        // IPFS link to Prospectus
        address issuer;
        uint256 targetRaise;
        uint256 totalRaised;
        uint256 maturity;
        ProjectStatus status;
    }

    uint256 public nextProjectId;
    mapping(uint256 => Project) public projects;

    event ProjectListed(uint256 indexed id, address issuer, uint256 target);
    event ProjectApproved(uint256 indexed id);
    event Invested(uint256 indexed id, address investor, uint256 amount);
    event YieldDistributed(uint256 indexed id, uint256 amount);

    constructor(
        string memory _uri, 
        address _accessControl, 
        address _shariaRegistry,
        address _paymentToken
    ) ERC1155(_uri) {
        accessControl = AccessControlManager(_accessControl);
        shariaRegistry = ShariaRegistry(_shariaRegistry);
        paymentToken = IERC20(_paymentToken);
    }

    /**
     * @notice Issuer requests to list a new Sukuk.
     */
    function listProject(string calldata dataHash, uint256 targetRaise, uint256 maturity) external {
        uint256 id = nextProjectId++;
        projects[id] = Project({
            id: id,
            dataHash: dataHash,
            issuer: msg.sender,
            targetRaise: targetRaise,
            totalRaised: 0,
            maturity: maturity,
            status: ProjectStatus.PENDING_SHARIA // Must wait for Fatwa
        });

        emit ProjectListed(id, msg.sender, targetRaise);
    }

    /**
     * @notice Sharia Board approves the project structure.
     */
    function approveProject(uint256 id) external {
        require(accessControl.hasRole(accessControl.SHARIA_BOARD_ROLE(), msg.sender), "SSB Only");
        require(projects[id].status == ProjectStatus.PENDING_SHARIA, "Invalid Status");
        
        projects[id].status = ProjectStatus.FUNDING;
        emit ProjectApproved(id);
    }

    /**
     * @notice Investors fund the Sukuk.
     */
    function invest(uint256 id, uint256 amount) external nonReentrant {
        Project storage p = projects[id];
        require(p.status == ProjectStatus.FUNDING, "Not funding");
        require(p.totalRaised + amount <= p.targetRaise, "Overfunded");

        // Transfer H-GOLD to this contract (Escrow)
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Mint Sukuk Tokens (1:1 with H-GOLD face value)
        _mint(msg.sender, id, amount, "");
        
        p.totalRaised += amount;
        emit Invested(id, msg.sender, amount);

        // If fully funded, move funds to issuer and activate
        if (p.totalRaised == p.targetRaise) {
            p.status = ProjectStatus.ACTIVE;
            paymentToken.safeTransfer(p.issuer, p.totalRaised);
        }
    }

    /**
     * @notice Issuer distributes yield (Rent/Profit) to holders.
     * @dev Simplified for MVP: Pushes to contract, holders must claim (logic omitted for brevity, or push if small set).
     *      Here we just emit event and assume an off-chain distributor or `pull` pattern contract handles the split.
     */
    function distributeYield(uint256 id, uint256 amount) external {
        require(projects[id].status == ProjectStatus.ACTIVE, "Not active");
        
        // Issuer sends profit
        paymentToken.safeTransferFrom(msg.sender, address(this), amount);
        
        emit YieldDistributed(id, amount);
        // Logic to allow holders to claim pro-rata share would go here.
    }
}
