import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("Integration Flow", function () {
    let HalalToken, HalGold, Vault;
    let halal, halGold, vault;
    let owner, user;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        HalalToken = await ethers.getContractFactory("HalalToken");
        halal = await HalalToken.deploy();

        HalGold = await ethers.getContractFactory("HalGoldStablecoin");
        halGold = await HalGold.deploy();

        Vault = await ethers.getContractFactory("MudarabahVault");
        vault = await Vault.deploy(await halGold.getAddress());
    });

    it("Full User Flow: Mint -> Invest -> Profit -> Withdraw -> Redeem", async function () {
        // 1. User gets some BNB (Has it by default in testnet)

        // 2. Mint HAL-GOLD (10 grams ~ $600)
        // Need ~$720 collateral (2.4 BNB approx with $300/BNB)
        const mintAmt = ethers.parseUnits("10", 18);
        const collateral = ethers.parseEther("3.0"); // Sufficient

        await halGold.connect(user).mint(mintAmt, { value: collateral });
        expect(await halGold.balanceOf(user.address)).to.equal(mintAmt);

        // 3. User deposits to Vault
        await halGold.connect(user).approve(await vault.getAddress(), mintAmt);
        await vault.connect(user).deposit(mintAmt);

        expect(await halGold.balanceOf(user.address)).to.equal(0);
        expect(await vault.shares(user.address)).to.equal(mintAmt); // 1:1 first deposit

        // 4. Admin generates profit (e.g. 5 tokens)
        // Admin needs tokens first
        await halGold.mint(ethers.parseUnits("10", 18), { value: ethers.parseEther("3.0") });
        await halGold.approve(await vault.getAddress(), ethers.parseUnits("5", 18));
        await vault.distributeProfit(ethers.parseUnits("5", 18));

        // Net profit = 4 tokens (20% fee = 1 token)

        // 5. User withdraws
        await vault.connect(user).withdraw(mintAmt);

        // Expect 10 + 4 = 14 tokens
        expect(await halGold.balanceOf(user.address)).to.equal(ethers.parseUnits("14", 18));

        // 6. User redeems HAL-GOLD for BNB
        // Redeem 14 tokens
        // 14 grams = $840
        // BNB = $300 -> 2.8 BNB
        // Fee 2% -> 0.056 BNB
        // Return ~ 2.744 BNB

        // Note: Contract must have enough BNB. It has 3.0 (user) + 3.0 (admin) = 6.0 BNB.

        const balBefore = await ethers.provider.getBalance(user.address);
        const tx = await halGold.connect(user).redeem(ethers.parseUnits("14", 18));
        const receipt = await tx.wait();
        const gasUsed = receipt.gasUsed * receipt.gasPrice;

        const balAfter = await ethers.provider.getBalance(user.address);

        // Check rough increase (around 2.7 BNB)
        // 2.7 BNB = 2.7 * 10^18
        const diff = balAfter - balBefore + gasUsed;
        expect(diff).to.be.closeTo(ethers.parseEther("2.744"), ethers.parseEther("0.01"));
    });
});
