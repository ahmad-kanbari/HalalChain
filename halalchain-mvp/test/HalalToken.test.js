import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("HalalToken", function () {
    let HalalToken, AccessControlManager;
    let halalToken, accessControl;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy AccessControlManager first
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        accessControl = await AccessControlManager.deploy(addr1.address);

        HalalToken = await ethers.getContractFactory("HalalToken");
        halalToken = await HalalToken.deploy(accessControl.target);
    });

    it("Should have correct initial supply", async function () {
        const ownerBalance = await halalToken.balanceOf(owner.address);
        expect(await halalToken.totalSupply()).to.equal(ownerBalance);
        // 1 billion * 10^18
        expect(await halalToken.totalSupply()).to.equal(ethers.parseUnits("1000000000", 18));
    });

    it("Should have correct name and symbol", async function () {
        expect(await halalToken.name()).to.equal("HalalChain");
        expect(await halalToken.symbol()).to.equal("HALAL");
    });

    it("Should allow admin to pause and unpause", async function () {
        await halalToken.pause();
        await expect(halalToken.transfer(addr1.address, 100)).to.be.revertedWithCustomError(halalToken, "EnforcedPause");

        await halalToken.unpause();
        await halalToken.transfer(addr1.address, 100);
        expect(await halalToken.balanceOf(addr1.address)).to.equal(100);
    });

    it("Should not allow non-admin to pause", async function () {
        await expect(halalToken.connect(addr1).pause()).to.be.revertedWithCustomError(halalToken, "AccessControlUnauthorizedAccount");
    });

    it("Should burn tokens", async function () {
        await halalToken.burn(1000);
        const expected = ethers.parseUnits("1000000000", 18) - 1000n;
        expect(await halalToken.totalSupply()).to.equal(expected);
    });
});
