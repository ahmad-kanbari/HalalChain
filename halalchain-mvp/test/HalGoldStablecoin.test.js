import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("HalGoldStablecoin", function () {
    let HalGold;
    let halGold;
    let owner;
    let user1;
    let accessControl, oracleHub, shariaRegistry;
    let goldPriceFeed, goldReserveFeed;

    beforeEach(async function () {
        [owner, user1] = await ethers.getSigners();

        // Deploy dependencies
        const AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        accessControl = await AccessControlManager.deploy(owner.address);

        const OPERATOR_ROLE = await accessControl.OPERATOR_ROLE();
        await accessControl.grantRole(OPERATOR_ROLE, owner.address);

        const MockAggregator = await ethers.getContractFactory("MockChainlinkAggregator");
        goldPriceFeed = await MockAggregator.deploy(8, "Gold/USD");
        goldReserveFeed = await MockAggregator.deploy(8, "Gold Reserve");

        // Set gold price to $60/gram and reserves to 1000 grams
        await goldPriceFeed.updateAnswer(6000000000); // $60 with 8 decimals
        await goldReserveFeed.updateAnswer(100000000000); // 1000 grams with 8 decimals

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
    });

    it("Should update prices correctly", async function () {
        await goldPriceFeed.updateAnswer(7000000000); // $70/gram
        const [price] = await oracleHub.getPrice(goldPriceFeed.target);
        expect(price).to.equal(7000000000);
    });

    it("Should return correct collateral ratio", async function () {
        const ratio = await halGold.getReserveRatio();
        // With 0 supply, ratio should be 10000 (100%)
        expect(ratio).to.equal(10000);
    });

    it("Should mint HAL-GOLD with sufficient reserves", async function () {
        // Reserves: 1000 grams at $60/gram = $60,000
        // We can mint up to $60,000 worth of tokens
        const mintAmount = ethers.parseUnits("100", 18); // 100 tokens

        await halGold.mint(user1.address, mintAmount);

        expect(await halGold.balanceOf(user1.address)).to.equal(mintAmount);
    });

    it("Should fail to mint with insufficient reserves", async function () {
        // Try to mint more than reserves allow
        const mintAmount = ethers.parseUnits("100000", 18); // Way over limit

        await expect(
            halGold.mint(user1.address, mintAmount)
        ).to.be.revertedWith("Insufficient Reserves (PoR Failed)");
    });

    it("Should request redemption", async function () {
        // 1. Mint first
        const mintAmount = ethers.parseUnits("100", 18);
        await halGold.mint(user1.address, mintAmount);

        // 2. Request redemption
        await halGold.connect(user1).requestRedemption(mintAmount);

        // Check that tokens were burned
        expect(await halGold.balanceOf(user1.address)).to.equal(0);

        // Check redemption request created
        const request = await halGold.redemptionRequests(0);
        expect(request.requester).to.equal(user1.address);
    });
});
