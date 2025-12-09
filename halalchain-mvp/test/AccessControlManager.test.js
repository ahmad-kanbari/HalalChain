import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("AccessControlManager", function () {
    async function deployAccessControlFixture() {
        const [owner, shariaBoard, operator, mudarib, oracleUpdater, auditor, user] =
            await ethers.getSigners();

        const AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        const accessControl = await AccessControlManager.deploy(shariaBoard.address);

        return {
            accessControl,
            owner,
            shariaBoard,
            operator,
            mudarib,
            oracleUpdater,
            auditor,
            user
        };
    }

    describe("Deployment", function () {
        it("Should set the deployer as DEFAULT_ADMIN_ROLE", async function () {
            const { accessControl, owner } = await loadFixture(deployAccessControlFixture);
            const DEFAULT_ADMIN_ROLE = await accessControl.DEFAULT_ADMIN_ROLE();
            expect(await accessControl.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
        });

        it("Should grant SHARIA_BOARD_ROLE to the initial sharia board", async function () {
            const { accessControl, shariaBoard } = await loadFixture(deployAccessControlFixture);
            const SHARIA_BOARD_ROLE = await accessControl.SHARIA_BOARD_ROLE();
            expect(await accessControl.hasRole(SHARIA_BOARD_ROLE, shariaBoard.address)).to.be.true;
        });

        it("Should revert if sharia board address is zero", async function () {
            const AccessControlManager = await ethers.getContractFactory("AccessControlManager");
            await expect(
                AccessControlManager.deploy(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid Sharia Board address");
        });

        it("Should emit RoleSetupCompleted event", async function () {
            const [owner, shariaBoard] = await ethers.getSigners();
            const AccessControlManager = await ethers.getContractFactory("AccessControlManager");

            const deployTx = AccessControlManager.deploy(shariaBoard.address);
            const accessControl = await deployTx;
            
            await expect(deployTx)
                .to.emit(accessControl, "RoleSetupCompleted")
                .withArgs(owner.address);
        });
    });

    describe("Role Management", function () {
        it("Should allow admin to grant OPERATOR_ROLE", async function () {
            const { accessControl, owner, operator } = await loadFixture(deployAccessControlFixture);
            const OPERATOR_ROLE = await accessControl.OPERATOR_ROLE();

            await accessControl.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
            expect(await accessControl.hasRole(OPERATOR_ROLE, operator.address)).to.be.true;
        });

        it("Should allow admin to grant MUDARIB_ROLE", async function () {
            const { accessControl, owner, mudarib } = await loadFixture(deployAccessControlFixture);
            const MUDARIB_ROLE = await accessControl.MUDARIB_ROLE();

            await accessControl.connect(owner).grantRole(MUDARIB_ROLE, mudarib.address);
            expect(await accessControl.hasRole(MUDARIB_ROLE, mudarib.address)).to.be.true;
        });

        it("Should allow admin to grant ORACLE_UPDATER_ROLE", async function () {
            const { accessControl, owner, oracleUpdater } = await loadFixture(deployAccessControlFixture);
            const ORACLE_UPDATER_ROLE = await accessControl.ORACLE_UPDATER_ROLE();

            await accessControl.connect(owner).grantRole(ORACLE_UPDATER_ROLE, oracleUpdater.address);
            expect(await accessControl.hasRole(ORACLE_UPDATER_ROLE, oracleUpdater.address)).to.be.true;
        });

        it("Should allow admin to grant AUDITOR_ROLE", async function () {
            const { accessControl, owner, auditor } = await loadFixture(deployAccessControlFixture);
            const AUDITOR_ROLE = await accessControl.AUDITOR_ROLE();

            await accessControl.connect(owner).grantRole(AUDITOR_ROLE, auditor.address);
            expect(await accessControl.hasRole(AUDITOR_ROLE, auditor.address)).to.be.true;
        });

        it("Should prevent non-admin from granting roles", async function () {
            const { accessControl, user, operator } = await loadFixture(deployAccessControlFixture);
            const OPERATOR_ROLE = await accessControl.OPERATOR_ROLE();
            const DEFAULT_ADMIN_ROLE = await accessControl.DEFAULT_ADMIN_ROLE();

            await expect(
                accessControl.connect(user).grantRole(OPERATOR_ROLE, operator.address)
            ).to.be.reverted;
        });

        it("Should allow admin to revoke roles", async function () {
            const { accessControl, owner, operator } = await loadFixture(deployAccessControlFixture);
            const OPERATOR_ROLE = await accessControl.OPERATOR_ROLE();

            await accessControl.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
            expect(await accessControl.hasRole(OPERATOR_ROLE, operator.address)).to.be.true;

            await accessControl.connect(owner).revokeRole(OPERATOR_ROLE, operator.address);
            expect(await accessControl.hasRole(OPERATOR_ROLE, operator.address)).to.be.false;
        });

        it("Should allow users to renounce their own roles", async function () {
            const { accessControl, owner, operator } = await loadFixture(deployAccessControlFixture);
            const OPERATOR_ROLE = await accessControl.OPERATOR_ROLE();

            await accessControl.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
            expect(await accessControl.hasRole(OPERATOR_ROLE, operator.address)).to.be.true;

            await accessControl.connect(operator).renounceRole(OPERATOR_ROLE, operator.address);
            expect(await accessControl.hasRole(OPERATOR_ROLE, operator.address)).to.be.false;
        });
    });

    describe("Helper Functions", function () {
        it("Should correctly identify Sharia Board members", async function () {
            const { accessControl, shariaBoard, user } = await loadFixture(deployAccessControlFixture);

            expect(await accessControl.isShariaBoard(shariaBoard.address)).to.be.true;
            expect(await accessControl.isShariaBoard(user.address)).to.be.false;
        });

        it("Should correctly identify Mudarib members", async function () {
            const { accessControl, owner, mudarib, user } = await loadFixture(deployAccessControlFixture);
            const MUDARIB_ROLE = await accessControl.MUDARIB_ROLE();

            await accessControl.connect(owner).grantRole(MUDARIB_ROLE, mudarib.address);

            expect(await accessControl.isMudarib(mudarib.address)).to.be.true;
            expect(await accessControl.isMudarib(user.address)).to.be.false;
        });
    });

    describe("Role Enumeration", function () {
        it("Should enumerate role members correctly", async function () {
            const { accessControl, owner, operator, mudarib } = await loadFixture(deployAccessControlFixture);
            const OPERATOR_ROLE = await accessControl.OPERATOR_ROLE();

            await accessControl.connect(owner).grantRole(OPERATOR_ROLE, operator.address);
            await accessControl.connect(owner).grantRole(OPERATOR_ROLE, mudarib.address);

            expect(await accessControl.getRoleMemberCount(OPERATOR_ROLE)).to.equal(2);
            expect(await accessControl.getRoleMember(OPERATOR_ROLE, 0)).to.equal(operator.address);
            expect(await accessControl.getRoleMember(OPERATOR_ROLE, 1)).to.equal(mudarib.address);
        });
    });
});
