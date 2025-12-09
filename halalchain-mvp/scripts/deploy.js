import hre from "hardhat";
import fs from "fs";

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy HALAL Token
    const HalalToken = await hre.ethers.getContractFactory("HalalToken");
    const halal = await HalalToken.deploy();
    await halal.waitForDeployment();
    const halalAddress = await halal.getAddress();
    console.log(`HalalToken deployed to: ${halalAddress}`);

    // 2. Deploy HAL-GOLD Stablecoin
    const HalGold = await hre.ethers.getContractFactory("HalGoldStablecoin");
    const halGold = await HalGold.deploy();
    await halGold.waitForDeployment();
    const halGoldAddress = await halGold.getAddress();
    console.log(`HalGoldStablecoin deployed to: ${halGoldAddress}`);

    // 3. Deploy Mudarabah Vault
    const Vault = await hre.ethers.getContractFactory("MudarabahVault");
    const vault = await Vault.deploy(halGoldAddress);
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log(`MudarabahVault deployed to: ${vaultAddress}`);

    // 4. Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        timestamp: new Date().toISOString(),
        contracts: {
            HalalToken: halalAddress,
            HalGoldStablecoin: halGoldAddress,
            MudarabahVault: vaultAddress
        }
    };

    fs.writeFileSync(
        "deployed_contracts.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("Deployment info saved to deployed_contracts.json");

    // 5. Verify (Wait a bit for propagation)
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\nTo verify contracts run:");
        console.log(`npx hardhat verify --network ${hre.network.name} ${halalAddress}`);
        console.log(`npx hardhat verify --network ${hre.network.name} ${halGoldAddress}`);
        console.log(`npx hardhat verify --network ${hre.network.name} ${vaultAddress} ${halGoldAddress}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
