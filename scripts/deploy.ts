import { ethers } from "hardhat";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config();

async function main() {
    console.log("🚀 开始部署IoTSFT合约...");
    
    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    console.log(`👤 部署账户: ${deployer.address}`);
    
    // 检查账户余额
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log(`💰 账户余额: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther("0.01")) {
        console.warn("⚠️  警告: 账户余额较低，可能不足以完成部署");
    }
    
    // 合约构造参数
    const contractName = "IoT Semi-Fungible Token";
    const contractSymbol = "IOTSFT";
    const decimals = 18;
    
    console.log("📄 合约参数:");
    console.log(`   名称: ${contractName}`);
    console.log(`   符号: ${contractSymbol}`);
    console.log(`   精度: ${decimals}`);
    
    // 获取合约工厂
    const IoTSFT = await ethers.getContractFactory("IoTSFT");
    
    // 估算部署Gas费用
    const deploymentData = IoTSFT.interface.encodeDeploy([contractName, contractSymbol, decimals]);
    const estimatedGas = await deployer.estimateGas({
        data: deploymentData,
    });
    
    const gasPrice = await deployer.provider.getFeeData();
    const estimatedCost = estimatedGas * (gasPrice.gasPrice || BigInt(0));
    
    console.log("⛽ Gas估算:");
    console.log(`   估算Gas: ${estimatedGas.toString()}`);
    console.log(`   Gas价格: ${ethers.formatUnits(gasPrice.gasPrice || BigInt(0), "gwei")} Gwei`);
    console.log(`   估算费用: ${ethers.formatEther(estimatedCost)} ETH`);
    
    // 部署合约
    console.log("📦 开始部署合约...");
    const iotSFT = await IoTSFT.deploy(contractName, contractSymbol, decimals);
    
    console.log(`📝 部署交易哈希: ${iotSFT.deploymentTransaction()?.hash}`);
    console.log("⏳ 等待部署确认...");
    
    // 等待部署完成
    await iotSFT.waitForDeployment();
    const contractAddress = await iotSFT.getAddress();
    
    console.log("✅ 合约部署成功!");
    console.log(`📍 合约地址: ${contractAddress}`);
    
    // 验证部署
    console.log("🔍 验证部署...");
    const deployedName = await iotSFT.name();
    const deployedSymbol = await iotSFT.symbol();
    const deployedDecimals = await iotSFT.valueDecimals();
    const owner = await iotSFT.owner();
    
    console.log("📋 部署验证结果:");
    console.log(`   名称: ${deployedName}`);
    console.log(`   符号: ${deployedSymbol}`);
    console.log(`   精度: ${deployedDecimals}`);
    console.log(`   所有者: ${owner}`);
    
    // 获取最终的Gas使用情况
    const deployTx = iotSFT.deploymentTransaction();
    if (deployTx) {
        const receipt = await deployTx.wait();
        if (receipt) {
            console.log("📊 最终Gas使用:");
            console.log(`   实际Gas: ${receipt.gasUsed.toString()}`);
            console.log(`   实际费用: ${ethers.formatEther(receipt.gasUsed * receipt.gasPrice)} ETH`);
        }
    }
    
    // 保存部署信息
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
    
    console.log("💾 部署信息:", JSON.stringify(deploymentInfo, null, 2));
    
    // 提示下一步操作
    console.log("🎯 下一步操作:");
    console.log(`1. 更新 .env 文件中的合约地址: CONTRACT_ADDRESS_${deploymentInfo.network.name.toUpperCase()}=${contractAddress}`);
    console.log(`2. 验证合约: npx hardhat verify --network ${deploymentInfo.network.name} ${contractAddress} "${contractName}" "${contractSymbol}" ${decimals}`);
    console.log("3. 开始铸造测试代币");
}

// 异常处理
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 部署失败:", error);
        process.exit(1);
    });
