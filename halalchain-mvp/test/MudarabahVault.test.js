import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("MudarabahVault", function () {
    let Vault, HalGold;
    let vault, halGold;
    let owner, user1, user2;
    let accessControl, oracleHub, shariaRegistry;
    let goldPriceFeed, goldReserveFeed;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy dependencies
        const AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        accessControl = await AccessControlManager.deploy(owner.address);

        const OPERATOR_ROLE = await accessControl.OPERATOR_ROLE();
        await accessControl.grantRole(OPERATOR_ROLE, owner.address);

        const MockAggregator = await ethers.getContractFactory("MockChainlinkAggregator");
        goldPriceFeed = await MockAggregator.deploy(8, "Gold/USD");
        goldReserveFeed = await MockAggregator.deploy(8, "Gold Reserve");

        await goldPriceFeed.updateAnswer(6000000000);
        await goldReserveFeed.updateAnswer(100000000000000);

        const ShariaRegistry = await ethers.getContractFactory("ShariaRegistry");
        shariaRegistry = await ShariaRegistry.deploy(accessControl.target);

        const OracleHub = await ethers.getContractFactory("OracleHub");
        oracleHub = await OracleHub.deploy(accessControl.target);

        await oracleHub.setFeed(goldPriceFeed.target, goldPriceFeed.target, 3600);
        await oracleHub.setFeed(goldReserveFeed.target, goldReserveFeed.target, 3600);

        HalGold = await ethers.getContractFactory("HalGoldStablecoin");
        halGold = await HalGold.deploy(
            accessControl.target,
            oracleHub.target,
            shariaRegistry.target,
            goldReserveFeed.target,
            goldPriceFeed.target
        );

        await shariaRegistry.registerFatwa(halGold.target, "QmTest", [owner.address]);

        Vault = await ethers.getContractFactory("MudarabahVault");
        vault = await Vault.deploy(await halGold.getAddress());

        // Mint tokens for users
        await halGold.mint(user1.address, ethers.parseEther("1000"));
        await halGold.mint(user2.address, ethers.parseEther("2000"));
    });

    it("Should deposit and mint shares 1:1 initially", async function () {
        await halGold.connect(user1).approve(await vault.getAddress(), ethers.parseUnits("10", 18));
        await vault.connect(user1).deposit(ethers.parseUnits("10", 18));

        expect(await vault.shares(user1.address)).to.equal(ethers.parseUnits("10", 18));
        expect(await vault.totalShares()).to.equal(ethers.parseUnits("10", 18));
    });

    it("Should distribute profit and increase share value", async function () {
        // User1 deposits 100
        const startAmount = ethers.parseUnits("100", 18);
        await halGold.connect(user1).approve(await vault.getAddress(), startAmount);
        await vault.connect(user1).deposit(startAmount);

        // Admin (Owner) adds profit (e.g. 10 tokens)
        // Need tokens for admin first
        await halGold.mint(owner.address, ethers.parseUnits("100", 18));
        await halGold.approve(await vault.getAddress(), ethers.parseUnits("10", 18));

        // Add 10 profit
        await vault.distributeProfit(ethers.parseUnits("10", 18));

        // Fee 20% = 2 tokens. Net profit = 8 tokens.
        // Vault total assets = 100 + 8 = 108.
        // Total shares = 100.
        // Share price = 1.08

        // User2 deposits 108 tokens. Should get 100 shares.
        await halGold.connect(user2).approve(await vault.getAddress(), ethers.parseUnits("108", 18));
        await vault.connect(user2).deposit(ethers.parseUnits("108", 18));

        expect(await vault.shares(user2.address)).to.equal(ethers.parseUnits("100", 18));
    });

    it("Should withdraw correct amount including profit", async function () {
        // User1 deposits 100
        const startAmount = ethers.parseUnits("100", 18);
        await halGold.connect(user1).approve(await vault.getAddress(), startAmount);
        await vault.connect(user1).deposit(startAmount);

        // Add profit 10 (Net 8)
        await halGold.mint(owner.address, ethers.parseUnits("100", 18));
        await halGold.approve(await vault.getAddress(), ethers.parseUnits("10", 18));
        await vault.distributeProfit(ethers.parseUnits("10", 18));

        // User1 withdraws all shares (100)
        // Should get 108
        const balBefore = await halGold.balanceOf(user1.address);
        await vault.connect(user1).withdraw(startAmount);
        const balAfter = await halGold.balanceOf(user1.address);

        expect(balAfter - balBefore).to.equal(ethers.parseUnits("108", 18));
    });
});
