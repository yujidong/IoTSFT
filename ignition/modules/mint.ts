import { ethers, JsonRpcProvider } from "ethers";
import dotenv from "dotenv";
// @ts-ignore
const IoTSFTJson = require("../../artifacts/contracts/IoTSFT.sol/IoTSFT.json");

// Load environment variables
dotenv.config();

// Environment variable configuration
const SEPOLIA_URL = process.env.SEPOLIA_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS_SEPOLIA;
const RECIPIENT_ADDRESS = process.env.DEFAULT_RECIPIENT_ADDRESS;
const VALUE_TO_MINT = parseInt(process.env.DEFAULT_MINT_VALUE || "100");

// Validate required environment variables
if (!SEPOLIA_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS || !RECIPIENT_ADDRESS) {
    console.error("❌ Error: Missing required environment variables");
    console.error("Please check if .env file contains: SEPOLIA_URL, PRIVATE_KEY, CONTRACT_ADDRESS_SEPOLIA, DEFAULT_RECIPIENT_ADDRESS");
    process.exit(1);
}

// Define DeviceType enum, consistent with smart contract
enum DeviceType {
    TemperatureSensor = 0,
    CrowdDensitySensor = 1
}

async function main() {
    // Initialize provider and signer
    const provider = new JsonRpcProvider(SEPOLIA_URL!);
    const signer = new ethers.Wallet(PRIVATE_KEY!, provider);

    // Initialize contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS!, IoTSFTJson.abi, signer);

    try {
        console.log("🚀 Starting IoT Token Minting...");
        console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
        console.log(`👤 Recipient Address: ${RECIPIENT_ADDRESS}`);
        console.log(`💰 Mint Value: ${VALUE_TO_MINT}`);
        
        // Call mint function with TemperatureSensor as example
        const tx = await contract.mint(
            RECIPIENT_ADDRESS,
            DeviceType.TemperatureSensor,
            VALUE_TO_MINT
        );

        console.log(`📝 Transaction Submitted: ${tx.hash}`);
        console.log("⏳ Waiting for transaction confirmation...");
        
        // Wait for transaction confirmation
        const receipt = await tx.wait();
        console.log(`✅ Minting Transaction Confirmed`);
        console.log(`🔗 Transaction Hash: ${receipt.transactionHash}`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
        console.log(`💸 Gas Fee: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} ETH`);
    } catch (error) {
        console.error('❌ Minting Failed:', error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Error occurred:', error);
    process.exitCode = 1;
});