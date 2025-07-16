import { ethers } from "hardhat";

async function main() {
    // 定义构造函数参数
    const name = "IoT SFT"; 
    const symbol = "IOTSFT"; 
    const decimals = 18; 

    // 获取合约工厂
    const IoTSFTFactory = await ethers.getContractFactory("IoTSFT"); 

    // 部署合约并传入构造函数参数
    const ioTSFT = await IoTSFTFactory.deploy(name, symbol, decimals); 

    // 等待合约部署Complete
    await ioTSFT.waitForDeployment(); 

    console.log(`IoTSFT 合约已部署到地址: ${await ioTSFT.getAddress()}`); 
}

// 执行主函数并处理可能的错误
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});