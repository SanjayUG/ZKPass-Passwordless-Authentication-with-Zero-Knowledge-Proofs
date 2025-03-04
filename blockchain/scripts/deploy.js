const hre = require("hardhat");

async function main() {
    const AuthContract = await hre.ethers.getContractFactory("AuthContract");
    const authContract = await AuthContract.deploy();

    // Fix: Use `waitForDeployment()` instead of `.deployed()`
    await authContract.waitForDeployment();

    console.log("AuthContract Address deployed to:", authContract.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
