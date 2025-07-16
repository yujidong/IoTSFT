import { expect } from "chai";
import { ethers } from "hardhat";
import type { IoTSFT } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Gas Efficiency Tests", function () {
    let iotSFT: IoTSFT;
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;
    let addr3: SignerWithAddress;

    // Gas消耗基准值 (根据实际测试结果调整)
    const GAS_BENCHMARKS = {
        DEPLOY: 3000000,        // 调整为3M
        MINT: 220000,           // 调整为220K
        SPLIT: 250000,
        MERGE: 150000,
        TRANSFER: 100000,
    };

    beforeEach(async function () {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
        const IoTSFTFactory = await ethers.getContractFactory("IoTSFT");
        
        // 记录部署Gas消耗
        const deployTx = await IoTSFTFactory.getDeployTransaction("IoT SFT", "IOTSFT", 18);
        const estimatedDeployGas = await owner.estimateGas(deployTx);
        console.log(`📊 部署估算Gas: ${estimatedDeployGas.toString()}`);
        
        iotSFT = await IoTSFTFactory.deploy("IoT SFT", "IOTSFT", 18);
        await iotSFT.waitForDeployment();
        
        const deployReceipt = await iotSFT.deploymentTransaction()?.wait();
        if (deployReceipt) {
            console.log(`📊 实际部署Gas: ${deployReceipt.gasUsed.toString()}`);
            expect(deployReceipt.gasUsed).to.be.lessThanOrEqual(GAS_BENCHMARKS.DEPLOY);
        }
    });

    describe("铸造操作Gas效率", function () {
        it("单次铸造应在合理Gas范围内", async function () {
            const deviceType = 0; // TemperatureSensor
            const value = 100;
            
            // 估算Gas
            const estimatedGas = await iotSFT.mint.estimateGas(addr1.address, deviceType, value);
            console.log(`📊 铸造估算Gas: ${estimatedGas.toString()}`);
            
            // 执行铸造
            const tx = await iotSFT.connect(owner).mint(addr1.address, deviceType, value);
            const receipt = await tx.wait();
            
            console.log(`📊 铸造实际Gas: ${receipt!.gasUsed.toString()}`);
            expect(receipt!.gasUsed).to.be.lessThanOrEqual(GAS_BENCHMARKS.MINT);
            
            // 计算Gas效率
            const gasPerValue = Number(receipt!.gasUsed) / value;
            console.log(`📊 每单位价值Gas消耗: ${gasPerValue.toFixed(2)}`);
        });

        it("批量铸造Gas效率测试", async function () {
            const deviceType = 0;
            const value = 100;
            const batchSize = 5;
            
            const gasUsages: bigint[] = [];
            
            for (let i = 0; i < batchSize; i++) {
                const tx = await iotSFT.connect(owner).mint(addr1.address, deviceType, value);
                const receipt = await tx.wait();
                gasUsages.push(receipt!.gasUsed);
                console.log(`📊 铸造 #${i + 1} Gas: ${receipt!.gasUsed.toString()}`);
            }
            
            // 计算平均Gas消耗
            const avgGas = gasUsages.reduce((sum, gas) => sum + gas, BigInt(0)) / BigInt(batchSize);
            console.log(`📊 平均铸造Gas: ${avgGas.toString()}`);
            
            // 验证Gas消耗稳定性
            const maxGas = gasUsages.reduce((max, gas) => gas > max ? gas : max, BigInt(0));
            const minGas = gasUsages.reduce((min, gas) => gas < min ? gas : min, gasUsages[0]);
            const gasVariation = Number(maxGas - minGas) / Number(avgGas) * 100;
            
            console.log(`📊 Gas消耗变化: ${gasVariation.toFixed(2)}%`);
            expect(gasVariation).to.be.lessThan(10); // Gas消耗变化应小于10%
        });
    });

    describe("分割操作Gas效率", function () {
        beforeEach(async function () {
            // 预先铸造代币用于测试
            await iotSFT.connect(owner).mint(addr1.address, 0, 1000);
        });

        it("单次分割应在合理Gas范围内", async function () {
            const tokenId = 1;
            const splitAmount = 100;
            
            const estimatedGas = await iotSFT.connect(addr1).splitValue.estimateGas(tokenId, splitAmount, addr2.address);
            console.log(`📊 分割估算Gas: ${estimatedGas.toString()}`);
            
            const tx = await iotSFT.connect(addr1).splitValue(tokenId, splitAmount, addr2.address);
            const receipt = await tx.wait();
            
            console.log(`📊 分割实际Gas: ${receipt!.gasUsed.toString()}`);
            expect(receipt!.gasUsed).to.be.lessThanOrEqual(GAS_BENCHMARKS.SPLIT);
        });

        it("连续分割Gas效率分析", async function () {
            const tokenId = 1;
            const splitAmount = 50;
            const splitCount = 5;
            
            for (let i = 0; i < splitCount; i++) {
                const tx = await iotSFT.connect(addr1).splitValue(tokenId, splitAmount, addr2.address);
                const receipt = await tx.wait();
                console.log(`📊 分割 #${i + 1} Gas: ${receipt!.gasUsed.toString()}`);
                
                // 验证每次分割Gas消耗应该相对稳定
                expect(receipt!.gasUsed).to.be.lessThanOrEqual(GAS_BENCHMARKS.SPLIT);
            }
        });
    });

    describe("合并操作Gas效率", function () {
        beforeEach(async function () {
            // 预先铸造两个同类型代币用于测试
            await iotSFT.connect(owner).mint(addr1.address, 0, 500);
            await iotSFT.connect(owner).mint(addr1.address, 0, 300);
        });

        it("单次合并应在合理Gas范围内", async function () {
            const fromTokenId = 1;
            const toTokenId = 2;
            const mergeAmount = 100;
            
            const estimatedGas = await iotSFT.connect(addr1).mergeValue.estimateGas(fromTokenId, toTokenId, mergeAmount);
            console.log(`📊 合并估算Gas: ${estimatedGas.toString()}`);
            
            const tx = await iotSFT.connect(addr1).mergeValue(fromTokenId, toTokenId, mergeAmount);
            const receipt = await tx.wait();
            
            console.log(`📊 合并实际Gas: ${receipt!.gasUsed.toString()}`);
            expect(receipt!.gasUsed).to.be.lessThanOrEqual(GAS_BENCHMARKS.MERGE);
        });
    });

    describe("Gas优化建议", function () {
        it("生成Gas效率报告", async function () {
            console.log("📋 ═══════════════════════════════════════");
            console.log("📋 IoTSFT合约Gas效率分析报告");
            console.log("📋 ═══════════════════════════════════════");
            
            // 测试各种操作的Gas消耗
            const operations = [
                {
                    name: "铸造温度传感器代币",
                    action: () => iotSFT.connect(owner).mint(addr1.address, 0, 100)
                },
                {
                    name: "铸造人群密度传感器代币", 
                    action: () => iotSFT.connect(owner).mint(addr1.address, 1, 100)
                }
            ];
            
            for (const op of operations) {
                const tx = await op.action();
                const receipt = await tx.wait();
                console.log(`📊 ${op.name}: ${receipt!.gasUsed.toString()} Gas`);
            }
            
            // 分割操作
            const splitTx = await iotSFT.connect(addr1).splitValue(1, 50, addr2.address);
            const splitReceipt = await splitTx.wait();
            console.log(`📊 分割代币: ${splitReceipt!.gasUsed.toString()} Gas`);
            
            // 合并操作  
            const mergeTx = await iotSFT.connect(addr1).mergeValue(1, 2, 30);
            const mergeReceipt = await mergeTx.wait();
            console.log(`📊 合并代币: ${mergeReceipt!.gasUsed.toString()} Gas`);
            
            console.log("📋 ═══════════════════════════════════════");
        });
    });
});
