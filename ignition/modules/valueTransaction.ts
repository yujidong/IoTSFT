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
const FROM_TOKEN_ID = 2; // Source token ID for value transfer (configurable via command line parameters)
const TO_TOKEN_ID = parseInt(process.env.DEFAULT_TOKEN_ID || "1"); // Destination token ID for value receipt
const TRANSFER_AMOUNT = 20; // Amount of value to transfer (configurable via command line parameters)

// Validate required environment variables
if (!SEPOLIA_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.error("❌ Error: Missing required environment variables");
    console.error("Please check if .env file contains: SEPOLIA_URL, PRIVATE_KEY, CONTRACT_ADDRESS_SEPOLIA");
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
        console.log("🔄 Starting value transfer transaction...");
        console.log(`📍 Contract address: ${CONTRACT_ADDRESS}`);
        console.log(`📤 Source token ID: ${FROM_TOKEN_ID}`);
        console.log(`📥 Target token ID: ${TO_TOKEN_ID}`);
        console.log(`💰 Transfer amount: ${TRANSFER_AMOUNT}`);
        
        // Check source token balance
        const fromBalance = await contract["balanceOf(uint256)"](FROM_TOKEN_ID);
        console.log(`💳 Source token balance: ${fromBalance.toString()}`);
        
        if (fromBalance < TRANSFER_AMOUNT) {
            console.error(`❌ Insufficient source token balance: current balance ${fromBalance.toString()}, required ${TRANSFER_AMOUNT}`);
            process.exit(1);
        }
        
        // Check if both tokens belong to the same slot
        const fromSlot = await contract.slotOf(FROM_TOKEN_ID);
        const toSlot = await contract.slotOf(TO_TOKEN_ID);
        console.log(`🎰 Source token slot: ${fromSlot.toString()}`);
        console.log(`🎰 Target token slot: ${toSlot.toString()}`);
        
        if (fromSlot !== toSlot) {
            console.error(`❌ Token slot mismatch: source token slot ${fromSlot.toString()}, target token slot ${toSlot.toString()}`);
            process.exit(1);
        }
        
        // Check target token current balance
        const toBalance = await contract["balanceOf(uint256)"](TO_TOKEN_ID);
        console.log(`💳 Target token current balance: ${toBalance.toString()}`);
        
        // Call mergeValue function
        const tx = await contract.mergeValue(
            FROM_TOKEN_ID, 
            TO_TOKEN_ID, 
            TRANSFER_AMOUNT
        );

        console.log(`📝 Transaction submitted: ${tx.hash}`);
        console.log("⏳ Waiting for transaction confirmation...");

        // Wait for transaction confirmation
        const receipt = await tx.wait();
        console.log(`✅ Value transfer transaction confirmed`);
        console.log(`🔗 Transaction hash: ${receipt.transactionHash}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`💸 Gas cost: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} ETH`);
        
        // Display post-transfer state
        const newFromBalance = await contract["balanceOf(uint256)"](FROM_TOKEN_ID);
        const newToBalance = await contract["balanceOf(uint256)"](TO_TOKEN_ID);
        console.log(`📊 Source token balance after transfer: ${newFromBalance.toString()}`);
        console.log(`📊 Target token balance after transfer: ${newToBalance.toString()}`);
    } catch (error) {
        console.error('❌ Value transfer failed:', error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Error occurred:', error);
    process.exitCode = 1;
});