import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("HalGoldStablecoin", function () {
    let HalGold;
    let halGold;
    let owner;
    let user1;

    beforeEach(async function () {
        [owner, user1] = await ethers.getSigners();
        HalGold = await ethers.getContractFactory("HalGoldStablecoin");
        halGold = await HalGold.deploy();
    });

    it("Should update prices correctly", async function () {
        await halGold.updatePrices(400 * 1e8, 70 * 1e8);
        expect(await halGold.bnbPriceUSD()).to.equal(400 * 1e8);
        expect(await halGold.goldPriceUSDPerGram()).to.equal(70 * 1e8);
    });

    it("Should return correct collateral ratio", async function () {
        // Initial ratio is 0
        expect(await halGold.getCollateralRatio()).to.equal(0);
    });

    it("Should mint HAL-GOLD with sufficient collateral", async function () {
        // Price: BNB $300, Gold $60/g.
        // 1 g Gold = $60.
        // Need 120% collateral = $72.
        // BNB = $300. So need 72/300 BNB = 0.24 BNB.

        // Let's deposit 1 BNB ($300).
        // Can mint max: 300 / 1.2 = $250 worth of gold.
        // $250 / $60 = 4.1666 grams.

        // Mint 1 HAL-GOLD (1 gram)
        // Coallateral needed: $72 worth of BNB = 0.24 BNB.

        const mintAmount = ethers.parseUnits("1", 18);
        const depositAmount = ethers.parseEther("1.0"); // 1 BNB

        await halGold.connect(user1).mint(mintAmount, { value: depositAmount });

        expect(await halGold.balanceOf(user1.address)).to.equal(mintAmount);
        expect(await halGold.userCollateral(user1.address)).to.equal(depositAmount);
    });

    it("Should fail to mint with insufficient collateral", async function () {
        const mintAmount = ethers.parseUnits("100", 18); // 100 grams = $6000
        const depositAmount = ethers.parseEther("1.0"); // $300
        // Requirement is way higher

        await expect(
            halGold.connect(user1).mint(mintAmount, { value: depositAmount })
        ).to.be.revertedWith("Insufficient collateral ratio");
    });

    it("Should redeem HAL-GOLD for BNB", async function () {
        // 1. Mint first
        const mintAmount = ethers.parseUnits("1", 18);
        // 1 BNB ($300) > 0.24 BNB ($72) required
        const depositAmount = ethers.parseEther("1.0");
        await halGold.connect(user1).mint(mintAmount, { value: depositAmount });

        // 2. Redeem
        // 1 HAL-GOLD = $60 (1g gold)
        // $60 in BNB = 0.2 BNB
        // Fee 2% = 0.004 BNB
        // Return = 0.196 BNB

        const initialBalance = await ethers.provider.getBalance(user1.address);
        const tx = await halGold.connect(user1).redeem(mintAmount);
        const receipt = await tx.wait();

        const gasSpent = receipt.gasUsed * receipt.gasPrice;

        const finalBalance = await ethers.provider.getBalance(user1.address);
        // Should have received ~0.196 BNB back, but spent gas
        // Since we are checking contract logic, we can check events or precise math if gas excluded, 
        // or just check tracked collateral reduced?

        // Collateral reduction check:
        // User collateral was 1.0. 
        // Redemption returned 0.196.
        // User collateral should reduce by 0.196?
        // The contract logic says: `userCollateral -= bnbToReturn`

        // bnbToReturn = 0.196 BNB approx
        // 1.0 - 0.196 = 0.804 remaining collateral

        const remainingCollateral = await halGold.userCollateral(user1.address);
        // 0.2 BNB is 200000000000000000 wei
        // 0.196 is 0.2 * 0.98 = 196000000000000000
        // 1000000000000000000 - 196000000000000000 = 804000000000000000

        expect(remainingCollateral).to.equal(804000000000000000n);
    });
});
