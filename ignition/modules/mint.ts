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
const RECIPIENT_ADDRESS = process.env.DEFAULT_RECIPIENT_ADDRESS;
const VALUE_TO_MINT = parseInt(process.env.DEFAULT_MINT_VALUE || "100");

// 验证必需的环境变量
if (!SEPOLIA_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS || !RECIPIENT_ADDRESS) {
    console.error("❌ 错误: 缺少必需的环境变量");
    console.error("请检查 .env 文件是否包含: SEPOLIA_URL, PRIVATE_KEY, CONTRACT_ADDRESS_SEPOLIA, DEFAULT_RECIPIENT_ADDRESS");
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
        console.log("🚀 开始铸造IoT代币...");
        console.log(`📍 合约地址: ${CONTRACT_ADDRESS}`);
        console.log(`👤 接收地址: ${RECIPIENT_ADDRESS}`);
        console.log(`💰 铸造价值: ${VALUE_TO_MINT}`);
        
        // 调用铸造函数，这里以 TemperatureSensor 为例
        const tx = await contract.mint(
            RECIPIENT_ADDRESS,
            DeviceType.TemperatureSensor,
            VALUE_TO_MINT
        );

        console.log(`📝 交易已提交: ${tx.hash}`);
        console.log("⏳ 等待交易确认...");
        
        // 等待交易确认
        const receipt = await tx.wait();
        console.log(`✅ 铸造交易已确认`);
        console.log(`🔗 交易哈希: ${receipt.transactionHash}`);
        console.log(`⛽ Gas使用量: ${receipt.gasUsed.toString()}`);
        console.log(`💸 Gas费用: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} ETH`);
    } catch (error) {
        console.error('❌ 铸造失败:', error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('发生错误:', error);
    process.exitCode = 1;
});