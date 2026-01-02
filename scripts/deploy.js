const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);

  // Deploy mock tokens
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const tokenA = await MockERC20.deploy("Token A", "TA", 1000);
  const tokenB = await MockERC20.deploy("Token B", "TB", 1000);

  console.log(`Token A deployed to: ${tokenA.address}`);
  console.log(`Token B deployed to: ${tokenB.address}`);

  // Deploy DEX
  const DEX = await ethers.getContractFactory("DEX");
  const dex = await DEX.deploy(tokenA.address, tokenB.address);

  console.log(`DEX deployed to: ${dex.address}`);
  console.log("Deployment completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
