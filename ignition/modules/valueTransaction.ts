import { ethers, JsonRpcProvider } from "ethers";
import dotenv from "dotenv";
// @ts-ignore
const IoTSFTJson = require("../../artifacts/contracts/IoTSFT.sol/IoTSFT.json");

// 加载环境变量
dotenv.config();

// 环境变量配置
const SEPOLIA_URL = process.env.SEPOLIA_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS_SEPOLIA;
const FROM_TOKEN_ID = 2; // 转出 Value 的代币 ID (可以通过命令行参数配置)
const TO_TOKEN_ID = parseInt(process.env.DEFAULT_TOKEN_ID || "1"); // 接收 Value 的代币 ID
const TRANSFER_AMOUNT = 20; // 要转移的 Value 数量 (可以通过命令行参数配置)

// 验证必需的环境变量
if (!SEPOLIA_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.error("❌ 错误: 缺少必需的环境变量");
    console.error("请检查 .env 文件是否包含: SEPOLIA_URL, PRIVATE_KEY, CONTRACT_ADDRESS_SEPOLIA");
    process.exit(1);
}

// 定义 DeviceType 枚举，与智能合约保持一致
enum DeviceType {
    TemperatureSensor = 0,
    CrowdDensitySensor = 1
}

async function main() {
    // 初始化 provider 和 signer
    const provider = new JsonRpcProvider(SEPOLIA_URL!);
    const signer = new ethers.Wallet(PRIVATE_KEY!, provider);

    // 初始化合约实例
    const contract = new ethers.Contract(CONTRACT_ADDRESS!, IoTSFTJson.abi, signer);

    try {
        console.log("🔄 开始Value转移交易...");
        console.log(`📍 合约地址: ${CONTRACT_ADDRESS}`);
        console.log(`📤 源代币ID: ${FROM_TOKEN_ID}`);
        console.log(`📥 目标代币ID: ${TO_TOKEN_ID}`);
        console.log(`💰 转移数量: ${TRANSFER_AMOUNT}`);
        
        // 检查源代币余额
        const fromBalance = await contract["balanceOf(uint256)"](FROM_TOKEN_ID);
        console.log(`💳 源代币余额: ${fromBalance.toString()}`);
        
        if (fromBalance < TRANSFER_AMOUNT) {
            console.error(`❌ 源代币余额不足: 当前余额 ${fromBalance.toString()}, 需要 ${TRANSFER_AMOUNT}`);
            process.exit(1);
        }
        
        // 检查两个代币是否属于同一slot
        const fromSlot = await contract.slotOf(FROM_TOKEN_ID);
        const toSlot = await contract.slotOf(TO_TOKEN_ID);
        console.log(`🎰 源代币Slot: ${fromSlot.toString()}`);
        console.log(`🎰 目标代币Slot: ${toSlot.toString()}`);
        
        if (fromSlot !== toSlot) {
            console.error(`❌ 代币Slot不匹配: 源代币Slot ${fromSlot.toString()}, 目标代币Slot ${toSlot.toString()}`);
            process.exit(1);
        }
        
        // 检查目标代币当前余额
        const toBalance = await contract["balanceOf(uint256)"](TO_TOKEN_ID);
        console.log(`💳 目标代币当前余额: ${toBalance.toString()}`);
        
        // 调用 mergeValue 函数
        const tx = await contract.mergeValue(
            FROM_TOKEN_ID, 
            TO_TOKEN_ID, 
            TRANSFER_AMOUNT
        );

        console.log(`📝 交易已提交: ${tx.hash}`);
        console.log("⏳ 等待交易确认...");

        // 等待交易确认
        const receipt = await tx.wait();
        console.log(`✅ Value转移交易已确认`);
        console.log(`🔗 交易哈希: ${receipt.transactionHash}`);
        console.log(`⛽ Gas使用量: ${receipt.gasUsed.toString()}`);
        console.log(`💸 Gas费用: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} ETH`);
        
        // 显示转移后的状态
        const newFromBalance = await contract["balanceOf(uint256)"](FROM_TOKEN_ID);
        const newToBalance = await contract["balanceOf(uint256)"](TO_TOKEN_ID);
        console.log(`📊 转移后源代币余额: ${newFromBalance.toString()}`);
        console.log(`📊 转移后目标代币余额: ${newToBalance.toString()}`);
    } catch (error) {
        console.error('❌ Value转移失败:', error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('发生错误:', error);
    process.exitCode = 1;
});