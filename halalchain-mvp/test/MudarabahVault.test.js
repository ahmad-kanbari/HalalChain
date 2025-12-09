import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("MudarabahVault", function () {
    let Vault, HalGold;
    let vault, halGold;
    let owner, user1, user2;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Mock token or Real token? Real token is fine
        HalGold = await ethers.getContractFactory("HalGoldStablecoin");
        halGold = await HalGold.deploy();

        Vault = await ethers.getContractFactory("MudarabahVault");
        vault = await Vault.deploy(await halGold.getAddress());

        // Give users some tokens
        // Owner is admin of HalGold, can mint directly? No, mint requires BNB.
        // But owner is owner, can set price? 
        // Let's just mint normally.
        const depositAmount = ethers.parseEther("100");
        await halGold.connect(user1).mint(ethers.parseUnits("100", 18), { value: depositAmount });
        await halGold.connect(user2).mint(ethers.parseUnits("200", 18), { value: ethers.parseEther("200") });
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
        await halGold.mint(ethers.parseUnits("100", 18), { value: ethers.parseEther("100") });
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
        await halGold.mint(ethers.parseUnits("100", 18), { value: ethers.parseEther("100") });
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
