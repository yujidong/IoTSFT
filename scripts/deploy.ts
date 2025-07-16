import { ethers } from "hardhat";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
    console.log("🚀 Starting IoTSFT contract deployment...");
    
    // Get deployment account
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deployment account: ${deployer.address}`);
    
    // Check account balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther("0.01")) {
        console.warn("⚠️  Warning: Account balance is low, may not be sufficient to complete deployment");
    }
    
    // Contract constructor parameters
    const contractName = "IoT Semi-Fungible Token";
    const contractSymbol = "IOTSFT";
    const decimals = 18;
    
    console.log("📄 Contract parameters:");
    console.log(`   Name: ${contractName}`);
    console.log(`   Symbol: ${contractSymbol}`);
    console.log(`   Decimals: ${decimals}`);
    
    // Get contract factory
    const IoTSFT = await ethers.getContractFactory("IoTSFT");
    
    // Estimate deployment gas cost
    const deploymentData = IoTSFT.interface.encodeDeploy([contractName, contractSymbol, decimals]);
    const estimatedGas = await deployer.estimateGas({
        data: deploymentData,
    });
    
    const gasPrice = await deployer.provider.getFeeData();
    const estimatedCost = estimatedGas * (gasPrice.gasPrice || BigInt(0));
    
    console.log("⛽ Gas estimation:");
    console.log(`   Estimated gas: ${estimatedGas.toString()}`);
    console.log(`   Gas price: ${ethers.formatUnits(gasPrice.gasPrice || BigInt(0), "gwei")} Gwei`);
    console.log(`   Estimated cost: ${ethers.formatEther(estimatedCost)} ETH`);
    
    // Deploy contract
    console.log("📦 Starting contract deployment...");
    const iotSFT = await IoTSFT.deploy(contractName, contractSymbol, decimals);
    
    console.log(`📝 Deployment transaction hash: ${iotSFT.deploymentTransaction()?.hash}`);
    console.log("⏳ Waiting for deployment confirmation...");
    
    // Wait for deployment completion
    await iotSFT.waitForDeployment();
    const contractAddress = await iotSFT.getAddress();
    
    console.log("✅ Contract deployment successful!");
    console.log(`📍 Contract address: ${contractAddress}`);
    
    // Verify deployment
    console.log("🔍 Verifying deployment...");
    const deployedName = await iotSFT.name();
    const deployedSymbol = await iotSFT.symbol();
    const deployedDecimals = await iotSFT.valueDecimals();
    const owner = await iotSFT.owner();
    
    console.log("📋 Deployment verification results:");
    console.log(`   Name: ${deployedName}`);
    console.log(`   Symbol: ${deployedSymbol}`);
    console.log(`   Decimals: ${deployedDecimals}`);
    console.log(`   Owner: ${owner}`);
    
    // Get final gas usage information
    const deployTx = iotSFT.deploymentTransaction();
    if (deployTx) {
        const receipt = await deployTx.wait();
        if (receipt) {
            console.log("📊 Final gas usage:");
            console.log(`   Actual gas: ${receipt.gasUsed.toString()}`);
            console.log(`   Actual cost: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} ETH`);
        }
    }
    
    // Save deployment information
    const deploymentInfo = {
        network: await deployer.provider.getNetwork(),
        contractAddress: contractAddress,
        deployerAddress: deployer.address,
        deploymentTime: new Date().toISOString(),
        contractName: deployedName,
        contractSymbol: deployedSymbol,
        decimals: deployedDecimals.toString(),
        deploymentHash: deployTx?.hash,
    };
    
    console.log("💾 Deployment information:", JSON.stringify(deploymentInfo, null, 2));
    
    // Next step operations
    console.log("🎯 Next steps:");
    console.log(`1. Update contract address in .env file: CONTRACT_ADDRESS_${deploymentInfo.network.name.toUpperCase()}=${contractAddress}`);
    console.log(`2. Verify contract: npx hardhat verify --network ${deploymentInfo.network.name} ${contractAddress} "${contractName}" "${contractSymbol}" ${decimals}`);
    console.log("3. Start minting test tokens");
}

// Error handling
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
