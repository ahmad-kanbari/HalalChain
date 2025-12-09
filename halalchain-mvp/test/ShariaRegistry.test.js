import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("ShariaRegistry", function () {
    async function deployShariaRegistryFixture() {
        const [owner, shariaBoard, user, contract1, scholar1, scholar2, scholar3] =
            await ethers.getSigners();

        // Deploy AccessControlManager
        const AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        const accessControl = await AccessControlManager.deploy(shariaBoard.address);

        // Deploy ShariaRegistry
        const ShariaRegistry = await ethers.getContractFactory("ShariaRegistry");
        const shariaRegistry = await ShariaRegistry.deploy(accessControl.target);

        return {
            shariaRegistry,
            accessControl,
            owner,
            shariaBoard,
            user,
            contract1,
            scholar1,
            scholar2,
            scholar3
        };
    }

    describe("Deployment", function () {
        it("Should set the access control manager correctly", async function () {
            const { shariaRegistry, accessControl } = await loadFixture(deployShariaRegistryFixture);
            expect(await shariaRegistry.accessControl()).to.equal(accessControl.target);
        });

        it("Should revert if access control address is zero", async function () {
            const ShariaRegistry = await ethers.getContractFactory("ShariaRegistry");
            await expect(ShariaRegistry.deploy(ethers.ZeroAddress)).to.be.revertedWith("Invalid ACM");
        });
    });

    describe("Fatwa Registration", function () {
        it("Should allow Sharia Board to register a fatwa", async function () {
            const { shariaRegistry, shariaBoard, contract1, scholar1, scholar2 } =
                await loadFixture(deployShariaRegistryFixture);

            const ipfsHash = "QmXyz123...";
            const signers = [scholar1.address, scholar2.address];

            await expect(
                shariaRegistry.connect(shariaBoard).registerFatwa(contract1.address, ipfsHash, signers)
            )
                .to.emit(shariaRegistry, "FatwaRegistered")
                .withArgs(contract1.address, ipfsHash)
                .and.to.emit(shariaRegistry, "ComplianceStatusChanged")
                .withArgs(contract1.address, true, "Fatwa Issued");
        });

        it("Should set contract as halal after fatwa registration", async function () {
            const { shariaRegistry, shariaBoard, contract1, scholar1 } =
                await loadFixture(deployShariaRegistryFixture);

            const ipfsHash = "QmXyz123...";
            const signers = [scholar1.address];

            await shariaRegistry.connect(shariaBoard).registerFatwa(contract1.address, ipfsHash, signers);

            expect(await shariaRegistry.isHalal(contract1.address)).to.be.true;
            expect(await shariaRegistry.isCompliant(contract1.address)).to.be.true;
        });

        it("Should store fatwa details correctly", async function () {
            const { shariaRegistry, shariaBoard, contract1, scholar1, scholar2 } =
                await loadFixture(deployShariaRegistryFixture);

            const ipfsHash = "QmXyz123...";
            const signers = [scholar1.address, scholar2.address];

            await shariaRegistry.connect(shariaBoard).registerFatwa(contract1.address, ipfsHash, signers);

            const fatwa = await shariaRegistry.contractFatwas(contract1.address);
            expect(fatwa.ipfsHash).to.equal(ipfsHash);
            expect(fatwa.isValid).to.be.true;
            expect(fatwa.issuedAt).to.be.gt(0);
        });

        it("Should prevent non-Sharia Board members from registering fatwa", async function () {
            const { shariaRegistry, user, contract1, scholar1 } =
                await loadFixture(deployShariaRegistryFixture);

            const ipfsHash = "QmXyz123...";
            const signers = [scholar1.address];

            await expect(
                shariaRegistry.connect(user).registerFatwa(contract1.address, ipfsHash, signers)
            ).to.be.revertedWith("Caller is not Sharia Board");
        });

        it("Should revert if target address is zero", async function () {
            const { shariaRegistry, shariaBoard, scholar1 } =
                await loadFixture(deployShariaRegistryFixture);

            const ipfsHash = "QmXyz123...";
            const signers = [scholar1.address];

            await expect(
                shariaRegistry.connect(shariaBoard).registerFatwa(ethers.ZeroAddress, ipfsHash, signers)
            ).to.be.revertedWith("Invalid address");
        });

        it("Should allow registering fatwa with empty signers array", async function () {
            const { shariaRegistry, shariaBoard, contract1 } =
                await loadFixture(deployShariaRegistryFixture);

            const ipfsHash = "QmXyz123...";
            const signers = [];

            await expect(
                shariaRegistry.connect(shariaBoard).registerFatwa(contract1.address, ipfsHash, signers)
            ).to.not.be.reverted;
        });

        it("Should allow multiple fatwas for different contracts", async function () {
            const { shariaRegistry, shariaBoard, contract1, scholar1, scholar2 } =
                await loadFixture(deployShariaRegistryFixture);

            const [, , , , contract2] = await ethers.getSigners();

            await shariaRegistry.connect(shariaBoard).registerFatwa(
                contract1.address,
                "QmHash1",
                [scholar1.address]
            );
            await shariaRegistry.connect(shariaBoard).registerFatwa(
                contract2.address,
                "QmHash2",
                [scholar2.address]
            );

            expect(await shariaRegistry.isCompliant(contract1.address)).to.be.true;
            expect(await shariaRegistry.isCompliant(contract2.address)).to.be.true;
        });

        it("Should overwrite existing fatwa when registering again", async function () {
            const { shariaRegistry, shariaBoard, contract1, scholar1, scholar2 } =
                await loadFixture(deployShariaRegistryFixture);

            await shariaRegistry.connect(shariaBoard).registerFatwa(
                contract1.address,
                "QmHash1",
                [scholar1.address]
            );

            let fatwa = await shariaRegistry.contractFatwas(contract1.address);
            expect(fatwa.ipfsHash).to.equal("QmHash1");

            await shariaRegistry.connect(shariaBoard).registerFatwa(
                contract1.address,
                "QmHash2",
                [scholar2.address]
            );

            fatwa = await shariaRegistry.contractFatwas(contract1.address);
            expect(fatwa.ipfsHash).to.equal("QmHash2");
        });
    });

    describe("Status Revocation", function () {
        it("Should allow Sharia Board to revoke status", async function () {
            const { shariaRegistry, shariaBoard, contract1, scholar1 } =
                await loadFixture(deployShariaRegistryFixture);

            await shariaRegistry.connect(shariaBoard).registerFatwa(
                contract1.address,
                "QmHash1",
                [scholar1.address]
            );

            const reasoning = "Project defaulted on obligations";
            await expect(
                shariaRegistry.connect(shariaBoard).revokeStatus(contract1.address, reasoning)
            )
                .to.emit(shariaRegistry, "ComplianceStatusChanged")
                .withArgs(contract1.address, false, reasoning);
        });

        it("Should set contract as non-halal after revocation", async function () {
            const { shariaRegistry, shariaBoard, contract1, scholar1 } =
                await loadFixture(deployShariaRegistryFixture);

            await shariaRegistry.connect(shariaBoard).registerFatwa(
                contract1.address,
                "QmHash1",
                [scholar1.address]
            );

            expect(await shariaRegistry.isCompliant(contract1.address)).to.be.true;

            await shariaRegistry.connect(shariaBoard).revokeStatus(contract1.address, "Default");

            expect(await shariaRegistry.isHalal(contract1.address)).to.be.false;
            expect(await shariaRegistry.isCompliant(contract1.address)).to.be.false;
        });

        it("Should invalidate fatwa after revocation", async function () {
            const { shariaRegistry, shariaBoard, contract1, scholar1 } =
                await loadFixture(deployShariaRegistryFixture);

            await shariaRegistry.connect(shariaBoard).registerFatwa(
                contract1.address,
                "QmHash1",
                [scholar1.address]
            );

            let fatwa = await shariaRegistry.contractFatwas(contract1.address);
            expect(fatwa.isValid).to.be.true;

            await shariaRegistry.connect(shariaBoard).revokeStatus(contract1.address, "Revoked");

            fatwa = await shariaRegistry.contractFatwas(contract1.address);
            expect(fatwa.isValid).to.be.false;
        });

        it("Should prevent non-Sharia Board members from revoking status", async function () {
            const { shariaRegistry, user, contract1 } =
                await loadFixture(deployShariaRegistryFixture);

            await expect(
                shariaRegistry.connect(user).revokeStatus(contract1.address, "Attempt")
            ).to.be.revertedWith("Caller is not Sharia Board");
        });

        it("Should allow revoking status of unregistered contract", async function () {
            const { shariaRegistry, shariaBoard, contract1 } =
                await loadFixture(deployShariaRegistryFixture);

            await expect(
                shariaRegistry.connect(shariaBoard).revokeStatus(contract1.address, "Never approved")
            ).to.not.be.reverted;

            expect(await shariaRegistry.isCompliant(contract1.address)).to.be.false;
        });
    });

    describe("Compliance Checks", function () {
        it("Should return false for non-registered contracts", async function () {
            const { shariaRegistry, contract1 } = await loadFixture(deployShariaRegistryFixture);

            expect(await shariaRegistry.isCompliant(contract1.address)).to.be.false;
            expect(await shariaRegistry.isHalal(contract1.address)).to.be.false;
        });

        it("Should return true for registered contracts", async function () {
            const { shariaRegistry, shariaBoard, contract1, scholar1 } =
                await loadFixture(deployShariaRegistryFixture);

            await shariaRegistry.connect(shariaBoard).registerFatwa(
                contract1.address,
                "QmHash1",
                [scholar1.address]
            );

            expect(await shariaRegistry.isCompliant(contract1.address)).to.be.true;
        });

        it("Should return false after revocation", async function () {
            const { shariaRegistry, shariaBoard, contract1, scholar1 } =
                await loadFixture(deployShariaRegistryFixture);

            await shariaRegistry.connect(shariaBoard).registerFatwa(
                contract1.address,
                "QmHash1",
                [scholar1.address]
            );

            await shariaRegistry.connect(shariaBoard).revokeStatus(contract1.address, "Revoked");

            expect(await shariaRegistry.isCompliant(contract1.address)).to.be.false;
        });
    });

    describe("Fatwa Details", function () {
        it("Should return empty fatwa for non-registered contract", async function () {
            const { shariaRegistry, contract1 } = await loadFixture(deployShariaRegistryFixture);

            const fatwa = await shariaRegistry.contractFatwas(contract1.address);
            expect(fatwa.ipfsHash).to.equal("");
            expect(fatwa.issuedAt).to.equal(0);
            expect(fatwa.isValid).to.be.false;
        });

        it("Should preserve fatwa metadata after revocation", async function () {
            const { shariaRegistry, shariaBoard, contract1, scholar1 } =
                await loadFixture(deployShariaRegistryFixture);

            const ipfsHash = "QmHash1";
            await shariaRegistry.connect(shariaBoard).registerFatwa(
                contract1.address,
                ipfsHash,
                [scholar1.address]
            );

            let fatwa = await shariaRegistry.contractFatwas(contract1.address);
            const originalIssuedAt = fatwa.issuedAt;

            await shariaRegistry.connect(shariaBoard).revokeStatus(contract1.address, "Revoked");

            fatwa = await shariaRegistry.contractFatwas(contract1.address);
            expect(fatwa.ipfsHash).to.equal(ipfsHash);
            expect(fatwa.issuedAt).to.equal(originalIssuedAt);
            expect(fatwa.isValid).to.be.false;
        });
    });
});
