import { run } from "hardhat";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
    // Get contract address from environment variable or command line argument
    const contractAddress = process.env.CONTRACT_ADDRESS_SEPOLIA || process.argv[2];
    
    if (!contractAddress) {
        console.error("❌ Error: Contract address not provided");
        console.error("Usage:");
        console.error("1. Set CONTRACT_ADDRESS_SEPOLIA in .env file");
        console.error("2. Or via command line: npx hardhat run scripts/verify.ts --network sepolia 0x...");
        process.exit(1);
    }
    
    // Contract constructor parameters (must match exactly with deployment)
    const contractName = "IoT Semi-Fungible Token";
    const contractSymbol = "IOTSFT";
    const decimals = 18;
    
    console.log("🔍 Starting contract verification...");
    console.log(`📍 Contract address: ${contractAddress}`);
    console.log(`📄 Constructor parameters: ["${contractName}", "${contractSymbol}", ${decimals}]`);
    
    try {
        // Verify contract
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: [contractName, contractSymbol, decimals],
        });
        
        console.log("✅ Contract verification successful!");
        console.log(`🌐 View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
        
    } catch (error: any) {
        if (error.message.toLowerCase().includes("already verified")) {
            console.log("ℹ️  Contract already verified");
            console.log(`🌐 View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
        } else {
            console.error("❌ Verification failed:", error.message);
            
            // Provide troubleshooting suggestions
            console.log("🔧 Troubleshooting suggestions:");
            console.log("1. Check if ETHERSCAN_API_KEY is correctly set");
            console.log("2. Confirm contract address is correct");
            console.log("3. Confirm constructor parameters match exactly with deployment");
            console.log("4. Wait a few minutes and retry (sometimes needs to wait for block confirmation)");
            
            process.exit(1);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Verification error:", error);
        process.exit(1);
    });
