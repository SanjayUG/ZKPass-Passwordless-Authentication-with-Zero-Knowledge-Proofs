// Deployment script for ZKPass contract
import { ethers } from "hardhat";

async function main() {
  // Deploy ZKPass contract
  console.log("Deploying ZKPass contract...");
  const ZKPass = await ethers.getContractFactory("ZKPass");
  const zkPass = await ZKPass.deploy();
  await zkPass.waitForDeployment();
  const contractAddress = await zkPass.getAddress();
  console.log(`ZKPass deployed`);

  // Log the contract address for .env file
  console.log("\nAdd this address to your .env file:");
  console.log(`CONTRACT_ADDRESS=${contractAddress}  // ZKPass contract address`);
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });