import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Integration Flow", function () {
    let accessControl, oracleHub, shariaRegistry;
    let HalalToken, HalGold, Vault;
    let halal, halGold, vault;
    let owner, user, shariaBoard;
    let goldPriceFeed, goldReserveFeed;

    beforeEach(async function () {
        [owner, user, shariaBoard] = await ethers.getSigners();

        // Deploy AccessControlManager
        const AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        accessControl = await AccessControlManager.deploy(shariaBoard.address);

        // Deploy Mock Chainlink Aggregators
        const MockAggregator = await ethers.getContractFactory("MockChainlinkAggregator");
        goldPriceFeed = await MockAggregator.deploy(8, "Gold/USD");
        goldReserveFeed = await MockAggregator.deploy(8, "Gold Reserve");
        
        await goldPriceFeed.updateAnswer(6000000000); // $60/gram
        await goldReserveFeed.updateAnswer(100000000000000); // 1M grams

        // Deploy ShariaRegistry
        const ShariaRegistry = await ethers.getContractFactory("ShariaRegistry");
        shariaRegistry = await ShariaRegistry.deploy(accessControl.target);

        // Deploy OracleHub
        const OracleHub = await ethers.getContractFactory("OracleHub");
        oracleHub = await OracleHub.deploy(accessControl.target);

        // Setup oracle feeds
        await oracleHub.connect(owner).setFeed(goldPriceFeed.target, goldPriceFeed.target, 3600);
        await oracleHub.connect(owner).setFeed(goldReserveFeed.target, goldReserveFeed.target, 3600);

        // Grant operator role to owner
        const OPERATOR_ROLE = await accessControl.OPERATOR_ROLE();
        await accessControl.grantRole(OPERATOR_ROLE, owner.address);

        HalalToken = await ethers.getContractFactory("HalalToken");
        halal = await HalalToken.deploy(accessControl.target);

        HalGold = await ethers.getContractFactory("HalGoldStablecoin");
        halGold = await HalGold.deploy(
            accessControl.target,
            oracleHub.target,
            shariaRegistry.target,
            goldReserveFeed.target,
            goldPriceFeed.target
        );

        // Mark contracts as compliant
        await shariaRegistry.connect(shariaBoard).registerFatwa(halal.target, "QmHalalTokenFatwa", [shariaBoard.address]);
        await shariaRegistry.connect(shariaBoard).registerFatwa(halGold.target, "QmHalGoldFatwa", [shariaBoard.address]);

        Vault = await ethers.getContractFactory("MudarabahVault");
        vault = await Vault.deploy(
            halGold.target,
            accessControl.target,
            shariaRegistry.target
        );

        await shariaRegistry.connect(shariaBoard).registerFatwa(vault.target, "QmVaultFatwa", [shariaBoard.address]);
    });

    it("Full User Flow: Mint -> Invest -> Profit -> Withdraw", async function () {
        // 1. Mint HAL-GOLD for user
        const mintAmt = ethers.parseEther("1000");
        await halGold.connect(owner).mint(user.address, mintAmt);
        expect(await halGold.balanceOf(user.address)).to.equal(mintAmt);

        // 2. User deposits to Vault
        await halGold.connect(user).approve(vault.target, mintAmt);
        await vault.connect(user).deposit(mintAmt, user.address);

        expect(await halGold.balanceOf(user.address)).to.equal(0);
        
        // 3. Simulate profit distribution
        const profitAmt = ethers.parseEther("100");
        await halGold.connect(owner).mint(owner.address, profitAmt);
        await halGold.connect(owner).transfer(vault.target, profitAmt);

        // 4. User withdraws (should get original + profit minus fees)
        const userShares = await vault.balanceOf(user.address);
        const assets = await vault.previewRedeem(userShares);
        
        await vault.connect(user).redeem(userShares, user.address, user.address);
        
        // User should have more than initial deposit due to profit
        expect(await halGold.balanceOf(user.address)).to.be.gt(mintAmt);
    });
});
