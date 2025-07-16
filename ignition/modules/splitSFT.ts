import { ethers, JsonRpcProvider } from "ethers";
// @ts-ignore
const IoTSFTJson = require("../../artifacts/contracts/IoTSFT.sol/IoTSFT.json");

// 配置项，请替换为实际值
const SEPOLIA_URL = "https://sepolia.infura.io/v3/27be5b3ba0b04639aeae77978b18114d";
const PRIVATE_KEY = "c55822eded57ae051e2636b694d21f3cceac5e282c5d4e8b691a9051d278d3f1";
const CONTRACT_ADDRESS = "0x1D566738e03C97A39B0135D2b87C82Fb35950f3F";
const TOKEN_ID = 1; // 请替换为实际要分割的代币 ID
const RECIPIENT_ADDRESS = "0x8908865F3dc2D7D26237da944F0a2dcDC7B01859"; // 接收新代币的地址
const SPLIT_AMOUNT = 50; // 要分割出来的价值

// 定义 DeviceType 枚举，与智能合约保持一致
enum DeviceType {
    TemperatureSensor = 0,
    CrowdDensitySensor = 1
}

async function main() {
    // 初始化 provider 和 signer
    const provider = new JsonRpcProvider(SEPOLIA_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // 初始化合约实例
    const contract = new ethers.Contract(CONTRACT_ADDRESS, IoTSFTJson.abi, signer);

    try {
        // 调用 splitValue 函数，确保参数与合约定义一致
        const tx = await contract.splitValue(
            TOKEN_ID, 
            SPLIT_AMOUNT, 
            RECIPIENT_ADDRESS
        );

        // 等待交易确认
        const receipt = await tx.wait();
        console.log(`分割交易已确认，交易哈希: ${receipt.transactionHash}`);
    } catch (error) {
        console.error('分割失败:', error);
    }
}

main().catch((error) => {
    console.error('发生错误:', error);
    process.exitCode = 1;
});