import { run } from "hardhat";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config();

async function main() {
    // 从环境变量或命令行参数获取合约地址
    const contractAddress = process.env.CONTRACT_ADDRESS_SEPOLIA || process.argv[2];
    
    if (!contractAddress) {
        console.error("❌ 错误: 未提供合约地址");
        console.error("使用方法:");
        console.error("1. 在 .env 文件中设置 CONTRACT_ADDRESS_SEPOLIA");
        console.error("2. 或通过命令行参数: npx hardhat run scripts/verify.ts --network sepolia 0x...");
        process.exit(1);
    }
    
    // 合约构造参数 (必须与部署时完全一致)
    const contractName = "IoT Semi-Fungible Token";
    const contractSymbol = "IOTSFT";
    const decimals = 18;
    
    console.log("🔍 开始验证合约...");
    console.log(`📍 合约地址: ${contractAddress}`);
    console.log(`📄 构造参数: ["${contractName}", "${contractSymbol}", ${decimals}]`);
    
    try {
        // 验证合约
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: [contractName, contractSymbol, decimals],
        });
        
        console.log("✅ 合约验证成功!");
        console.log(`🌐 在Etherscan上查看: https://sepolia.etherscan.io/address/${contractAddress}`);
        
    } catch (error: any) {
        if (error.message.toLowerCase().includes("already verified")) {
            console.log("ℹ️  合约已经验证过了");
            console.log(`🌐 在Etherscan上查看: https://sepolia.etherscan.io/address/${contractAddress}`);
        } else {
            console.error("❌ 验证失败:", error.message);
            
            // 提供故障排除建议
            console.log("🔧 故障排除建议:");
            console.log("1. 检查ETHERSCAN_API_KEY是否正确设置");
            console.log("2. 确认合约地址是否正确");
            console.log("3. 确认构造参数与部署时完全一致");
            console.log("4. 等待几分钟后重试(有时需要等待区块确认)");
            
            process.exit(1);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 验证过程出错:", error);
        process.exit(1);
    });
