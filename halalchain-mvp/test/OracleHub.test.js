import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("OracleHub", function () {
    async function deployOracleHubFixture() {
        const [owner, shariaBoard, oracleUpdater, user] = await ethers.getSigners();

        // Deploy AccessControlManager first
        const AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        const accessControl = await AccessControlManager.deploy(shariaBoard.address);

        // Grant ORACLE_UPDATER_ROLE
        const ORACLE_UPDATER_ROLE = await accessControl.ORACLE_UPDATER_ROLE();
        await accessControl.connect(owner).grantRole(ORACLE_UPDATER_ROLE, oracleUpdater.address);

        // Deploy Mock Chainlink Aggregator
        const MockAggregator = await ethers.getContractFactory("MockChainlinkAggregator");
        const mockAggregator = await MockAggregator.deploy(8, "GOLD / USD");

        // Deploy OracleHub
        const OracleHub = await ethers.getContractFactory("OracleHub");
        const oracleHub = await OracleHub.deploy(accessControl.target);

        return {
            oracleHub,
            accessControl,
            mockAggregator,
            owner,
            shariaBoard,
            oracleUpdater,
            user,
            ORACLE_UPDATER_ROLE
        };
    }

    describe("Deployment", function () {
        it("Should set the access control manager correctly", async function () {
            const { oracleHub, accessControl } = await loadFixture(deployOracleHubFixture);
            expect(await oracleHub.accessControl()).to.equal(accessControl.target);
        });

        it("Should revert if access control address is zero", async function () {
            const OracleHub = await ethers.getContractFactory("OracleHub");
            await expect(OracleHub.deploy(ethers.ZeroAddress)).to.be.revertedWith("Invalid ACM");
        });
    });

    describe("Feed Management", function () {
        it("Should allow oracle updater to set feed", async function () {
            const { oracleHub, mockAggregator, oracleUpdater, user } = await loadFixture(deployOracleHubFixture);
            const maxStaleness = 3600; // 1 hour

            await expect(
                oracleHub.connect(oracleUpdater).setFeed(user.address, mockAggregator.target, maxStaleness)
            )
                .to.emit(oracleHub, "FeedUpdated")
                .withArgs(user.address, mockAggregator.target, maxStaleness);

            expect(await oracleHub.priceFeeds(user.address)).to.equal(mockAggregator.target);
            expect(await oracleHub.maxStaleness(user.address)).to.equal(maxStaleness);
        });

        it("Should allow admin to set feed", async function () {
            const { oracleHub, mockAggregator, owner, user } = await loadFixture(deployOracleHubFixture);
            const maxStaleness = 3600;

            await expect(
                oracleHub.connect(owner).setFeed(user.address, mockAggregator.target, maxStaleness)
            )
                .to.emit(oracleHub, "FeedUpdated")
                .withArgs(user.address, mockAggregator.target, maxStaleness);
        });

        it("Should prevent unauthorized users from setting feed", async function () {
            const { oracleHub, mockAggregator, user } = await loadFixture(deployOracleHubFixture);
            const maxStaleness = 3600;

            await expect(
                oracleHub.connect(user).setFeed(user.address, mockAggregator.target, maxStaleness)
            ).to.be.revertedWith("Caller is not Oracle Updater");
        });

        it("Should update existing feed", async function () {
            const { oracleHub, mockAggregator, oracleUpdater, user } = await loadFixture(deployOracleHubFixture);

            const MockAggregator2 = await ethers.getContractFactory("MockChainlinkAggregator");
            const mockAggregator2 = await MockAggregator2.deploy(8, "SILVER / USD");

            await oracleHub.connect(oracleUpdater).setFeed(user.address, mockAggregator.target, 3600);
            expect(await oracleHub.priceFeeds(user.address)).to.equal(mockAggregator.target);

            await oracleHub.connect(oracleUpdater).setFeed(user.address, mockAggregator2.target, 7200);
            expect(await oracleHub.priceFeeds(user.address)).to.equal(mockAggregator2.target);
            expect(await oracleHub.maxStaleness(user.address)).to.equal(7200);
        });
    });

    describe("Price Retrieval", function () {
        it("Should return correct price from fresh data", async function () {
            const { oracleHub, mockAggregator, oracleUpdater, user } = await loadFixture(deployOracleHubFixture);

            const price = ethers.parseUnits("1800", 8); // $1800 with 8 decimals
            await mockAggregator.updateAnswer(price);

            await oracleHub.connect(oracleUpdater).setFeed(user.address, mockAggregator.target, 3600);

            const [returnedPrice, decimals] = await oracleHub.getPrice(user.address);
            expect(returnedPrice).to.equal(price);
            expect(decimals).to.equal(8);
        });

        it("Should revert for non-existent feed", async function () {
            const { oracleHub, user } = await loadFixture(deployOracleHubFixture);

            await expect(oracleHub.getPrice(user.address)).to.be.revertedWith("Feed not found");
        });

        it("Should revert for stale data (Gharar)", async function () {
            const { oracleHub, mockAggregator, oracleUpdater, user } = await loadFixture(deployOracleHubFixture);

            const price = ethers.parseUnits("1800", 8);
            await mockAggregator.updateAnswer(price);

            const maxStaleness = 3600; // 1 hour
            await oracleHub.connect(oracleUpdater).setFeed(user.address, mockAggregator.target, maxStaleness);

            // Move time forward beyond staleness threshold
            await time.increase(maxStaleness + 1);

            await expect(oracleHub.getPrice(user.address)).to.be.revertedWith("Data Stale (Gharar)");
        });

        it("Should revert for negative price", async function () {
            const { oracleHub, mockAggregator, oracleUpdater, user } = await loadFixture(deployOracleHubFixture);

            await mockAggregator.updateAnswer(-100); // Negative price
            await oracleHub.connect(oracleUpdater).setFeed(user.address, mockAggregator.target, 3600);

            await expect(oracleHub.getPrice(user.address)).to.be.revertedWith("Price must be positive");
        });

        it("Should revert for zero price", async function () {
            const { oracleHub, mockAggregator, oracleUpdater, user } = await loadFixture(deployOracleHubFixture);

            await mockAggregator.updateAnswer(0);
            await oracleHub.connect(oracleUpdater).setFeed(user.address, mockAggregator.target, 3600);

            await expect(oracleHub.getPrice(user.address)).to.be.revertedWith("Price must be positive");
        });

        it("Should handle multiple feeds correctly", async function () {
            const { oracleHub, oracleUpdater, user } = await loadFixture(deployOracleHubFixture);

            const MockAggregator = await ethers.getContractFactory("MockChainlinkAggregator");
            const goldFeed = await MockAggregator.deploy(8, "GOLD / USD");
            const silverFeed = await MockAggregator.deploy(8, "SILVER / USD");

            const goldPrice = ethers.parseUnits("1800", 8);
            const silverPrice = ethers.parseUnits("25", 8);

            await goldFeed.updateAnswer(goldPrice);
            await silverFeed.updateAnswer(silverPrice);

            const [, addr2] = await ethers.getSigners();

            await oracleHub.connect(oracleUpdater).setFeed(user.address, goldFeed.target, 3600);
            await oracleHub.connect(oracleUpdater).setFeed(addr2.address, silverFeed.target, 3600);

            const [goldReturnedPrice, goldDecimals] = await oracleHub.getPrice(user.address);
            const [silverReturnedPrice, silverDecimals] = await oracleHub.getPrice(addr2.address);

            expect(goldReturnedPrice).to.equal(goldPrice);
            expect(silverReturnedPrice).to.equal(silverPrice);
            expect(goldDecimals).to.equal(8);
            expect(silverDecimals).to.equal(8);
        });

        it("Should work with data at staleness boundary", async function () {
            const { oracleHub, mockAggregator, oracleUpdater, user } = await loadFixture(deployOracleHubFixture);

            const price = ethers.parseUnits("1800", 8);
            await mockAggregator.updateAnswer(price);

            const maxStaleness = 3600;
            await oracleHub.connect(oracleUpdater).setFeed(user.address, mockAggregator.target, maxStaleness);

            // Move time forward exactly to staleness threshold (should still work)
            await time.increase(maxStaleness);

            const [returnedPrice, decimals] = await oracleHub.getPrice(user.address);
            expect(returnedPrice).to.equal(price);
            expect(decimals).to.equal(8);
        });
    });
});

// Mock Chainlink Aggregator for testing
// Note: This needs to be added as a separate contract file
