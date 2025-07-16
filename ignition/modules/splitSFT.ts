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
const TOKEN_ID = parseInt(process.env.DEFAULT_TOKEN_ID || "1");
const RECIPIENT_ADDRESS = process.env.DEFAULT_RECIPIENT_ADDRESS;
const SPLIT_AMOUNT = parseInt(process.env.DEFAULT_SPLIT_AMOUNT || "50");

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
        console.log("✂️ Starting IoT Token Split...");
        console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
        console.log(`🎫 Token ID: ${TOKEN_ID}`);
        console.log(`👤 Recipient Address: ${RECIPIENT_ADDRESS}`);
        console.log(`💰 Split Amount: ${SPLIT_AMOUNT}`);
        
        // Check token balance
        const balance = await contract["balanceOf(uint256)"](TOKEN_ID);
        console.log(`💳 Current Token Balance: ${balance.toString()}`);
        
        if (balance < SPLIT_AMOUNT) {
            console.error(`❌ Insufficient Balance: Current balance ${balance.toString()}, Required ${SPLIT_AMOUNT}`);
            process.exit(1);
        }
        
        // Call splitValue function with parameters matching contract definition
        const tx = await contract.splitValue(
            TOKEN_ID, 
            SPLIT_AMOUNT, 
            RECIPIENT_ADDRESS
        );

        console.log(`📝 Transaction Submitted: ${tx.hash}`);
        console.log("⏳ Waiting for transaction confirmation...");

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        console.log(`✅ Split Transaction Confirmed`);
        console.log(`🔗 Transaction Hash: ${receipt.transactionHash}`);
        console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
        console.log(`💸 Gas Fee: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} ETH`);
        
        // Display post-split status
        const newBalance = await contract["balanceOf(uint256)"](TOKEN_ID);
        console.log(`📊 Post-Split Original Token Balance: ${newBalance.toString()}`);
    } catch (error) {
        console.error('❌ Split Failed:', error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Error occurred:', error);
    process.exitCode = 1;
});