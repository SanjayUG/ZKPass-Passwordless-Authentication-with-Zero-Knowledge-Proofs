const hre = require("hardhat");

async function main() {
  const AuthContract = await hre.ethers.getContractFactory("AuthContract");
  const authContract = await AuthContract.deploy();
  await authContract.waitForDeployment();
  console.log("AuthContract deployed to:", authContract.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });