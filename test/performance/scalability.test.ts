import { expect } from "chai";
import { ethers } from "hardhat";
import type { IoTSFT } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Scalability Tests", function () {
    let iotSFT: IoTSFT;
    let owner: SignerWithAddress;
    let users: SignerWithAddress[];

    // 规模化测试配置
    const LARGE_BATCH_SIZE = 50;
    const MEDIUM_BATCH_SIZE = 20;
    const SMALL_BATCH_SIZE = 10;
    const STRESS_TEST_SIZE = 100;

    beforeEach(async function () {
        const signers = await ethers.getSigners();
        owner = signers[0];
        users = signers.slice(1, 10);
        
        const IoTSFTFactory = await ethers.getContractFactory("IoTSFT");
        iotSFT = await IoTSFTFactory.deploy("IoT SFT", "IOTSFT", 18);
        await iotSFT.waitForDeployment();
        
        console.log(`🏗️ 规模化测试环境准备完成`);
    });

    describe("大规模铸造测试", function () {
        it("连续铸造大量代币", async function () {
            console.log(`🏭 开始大规模铸造测试 (${LARGE_BATCH_SIZE} 个代币)...`);
            const startTime = Date.now();
            
            const mintResults = [];
            let totalGasUsed = BigInt(0);
            
            for (let i = 0; i < LARGE_BATCH_SIZE; i++) {
                const recipient = users[i % users.length];
                const deviceType = i % 2;
                const value = 100 + (i * 10);
                
                const tx = await iotSFT.connect(owner).mint(recipient.address, deviceType, value);
                const receipt = await tx.wait();
                
                totalGasUsed += receipt!.gasUsed;
                mintResults.push({
                    tokenId: i + 1,
                    gasUsed: receipt!.gasUsed,
                    value: value,
                    deviceType: deviceType
                });
                
                // 每10个代币报告一次进度
                if ((i + 1) % 10 === 0) {
                    console.log(`   ✅ 已铸造 ${i + 1}/${LARGE_BATCH_SIZE} 个代币`);
                }
            }
            
            const endTime = Date.now();
            const totalDuration = endTime - startTime;
            
            console.log(`📊 大规模铸造结果:`);
            console.log(`   代币数量: ${LARGE_BATCH_SIZE}`);
            console.log(`   总耗时: ${totalDuration}ms`);
            console.log(`   平均每个代币: ${(totalDuration / LARGE_BATCH_SIZE).toFixed(1)}ms`);
            console.log(`   总Gas消耗: ${totalGasUsed.toString()}`);
            console.log(`   平均Gas消耗: ${(Number(totalGasUsed) / LARGE_BATCH_SIZE).toFixed(0)}`);
            
            // 验证所有代币都被正确铸造
            for (let i = 0; i < LARGE_BATCH_SIZE; i++) {
                const balance = await iotSFT["balanceOf(uint256)"](i + 1);
                expect(balance).to.equal(100 + (i * 10));
            }
            
            // 性能基准检查
            expect(totalDuration).to.be.lessThan(120000); // 总耗时应少于2分钟
            const avgGasPerToken = Number(totalGasUsed) / LARGE_BATCH_SIZE;
            expect(avgGasPerToken).to.be.lessThan(250000); // 平均Gas应合理
        });

        it("不同设备类型的规模化铸造对比", async function () {
            console.log("🔄 设备类型规模化铸造对比测试...");
            
            const deviceTypes = [0, 1]; // TemperatureSensor, CrowdDensitySensor
            const results: any = {};
            
            for (const deviceType of deviceTypes) {
                console.log(`   测试设备类型 ${deviceType}...`);
                const startTime = Date.now();
                let totalGas = BigInt(0);
                
                for (let i = 0; i < MEDIUM_BATCH_SIZE; i++) {
                    const tx = await iotSFT.connect(owner).mint(
                        users[i % users.length].address, 
                        deviceType, 
                        100
                    );
                    const receipt = await tx.wait();
                    totalGas += receipt!.gasUsed;
                }
                
                const endTime = Date.now();
                results[deviceType] = {
                    duration: endTime - startTime,
                    totalGas: totalGas,
                    avgGas: Number(totalGas) / MEDIUM_BATCH_SIZE
                };
            }
            
            console.log(`📊 设备类型对比结果:`);
            deviceTypes.forEach(type => {
                console.log(`   设备类型 ${type}:`);
                console.log(`     耗时: ${results[type].duration}ms`);
                console.log(`     平均Gas: ${results[type].avgGas.toFixed(0)}`);
            });
            
            // 验证不同设备类型的性能差异应该很小
            const gasRatio = results[0].avgGas / results[1].avgGas;
            expect(gasRatio).to.be.closeTo(1.0, 0.1); // Gas消耗差异应小于10%
        });
    });

    describe("大规模分割测试", function () {
        beforeEach(async function () {
            // 准备一个大价值代币用于分割测试
            await iotSFT.connect(owner).mint(users[0].address, 0, 10000);
        });

        it("连续分割大量次数", async function () {
            console.log(`✂️ 开始大规模分割测试...`);
            const startTime = Date.now();
            
            const splitCount = 30;
            const splitAmount = 100;
            let totalGas = BigInt(0);
            
            for (let i = 0; i < splitCount; i++) {
                const recipient = users[(i + 1) % users.length];
                
                const tx = await iotSFT.connect(users[0]).splitValue(1, splitAmount, recipient.address);
                const receipt = await tx.wait();
                totalGas += receipt!.gasUsed;
                
                if ((i + 1) % 5 === 0) {
                    console.log(`   ✅ 已分割 ${i + 1}/${splitCount} 次`);
                }
                
                // 验证原代币余额递减
                const remainingBalance = await iotSFT["balanceOf(uint256)"](1);
                const expectedBalance = 10000 - (splitAmount * (i + 1));
                expect(remainingBalance).to.equal(expectedBalance);
            }
            
            const endTime = Date.now();
            
            console.log(`📊 大规模分割结果:`);
            console.log(`   分割次数: ${splitCount}`);
            console.log(`   总耗时: ${endTime - startTime}ms`);
            console.log(`   平均每次分割: ${((endTime - startTime) / splitCount).toFixed(1)}ms`);
            console.log(`   平均Gas消耗: ${(Number(totalGas) / splitCount).toFixed(0)}`);
            
            // 验证生成了正确数量的新代币
            for (let i = 2; i <= splitCount + 1; i++) {
                const balance = await iotSFT["balanceOf(uint256)"](i);
                expect(balance).to.equal(splitAmount);
            }
        });

        it("分割操作的Gas消耗趋势分析", async function () {
            console.log("📈 分割操作Gas消耗趋势分析...");
            
            const splitCount = 15;
            const gasHistory: number[] = [];
            
            for (let i = 0; i < splitCount; i++) {
                const tx = await iotSFT.connect(users[0]).splitValue(1, 50, users[1].address);
                const receipt = await tx.wait();
                gasHistory.push(Number(receipt!.gasUsed));
            }
            
            // 分析Gas消耗趋势
            console.log(`📊 Gas消耗趋势:`);
            console.log(`   第1次分割: ${gasHistory[0]} Gas`);
            console.log(`   第${splitCount}次分割: ${gasHistory[splitCount - 1]} Gas`);
            
            const avgGas = gasHistory.reduce((sum, gas) => sum + gas, 0) / gasHistory.length;
            const maxGas = Math.max(...gasHistory);
            const minGas = Math.min(...gasHistory);
            
            console.log(`   平均Gas: ${avgGas.toFixed(0)}`);
            console.log(`   最大Gas: ${maxGas}`);
            console.log(`   最小Gas: ${minGas}`);
            console.log(`   Gas变化幅度: ${((maxGas - minGas) / avgGas * 100).toFixed(1)}%`);
            
            // 验证Gas消耗相对稳定
            expect((maxGas - minGas) / avgGas).to.be.lessThan(0.15); // 变化幅度应小于15%
        });
    });

    describe("复杂操作序列测试", function () {
        it("大规模混合操作序列", async function () {
            console.log("🔀 开始大规模混合操作序列测试...");
            
            const operationCount = 50;
            const results = {
                mint: { count: 0, totalGas: BigInt(0) },
                split: { count: 0, totalGas: BigInt(0) },
                merge: { count: 0, totalGas: BigInt(0) }
            };
            
            // 初始铸造一些代币
            for (let i = 0; i < 5; i++) {
                await iotSFT.connect(owner).mint(users[i].address, 0, 1000);
                await iotSFT.connect(owner).mint(users[i].address, 1, 1000);
            }
            
            const startTime = Date.now();
            
            for (let i = 0; i < operationCount; i++) {
                const operationType = i % 3; // 循环执行三种操作
                
                try {
                    if (operationType === 0) {
                        // 铸造操作
                        const tx = await iotSFT.connect(owner).mint(
                            users[i % users.length].address, 
                            i % 2, 
                            200 + i
                        );
                        const receipt = await tx.wait();
                        results.mint.count++;
                        results.mint.totalGas += receipt!.gasUsed;
                        
                    } else if (operationType === 1) {
                        // 分割操作
                        const tokenId = (i % 10) + 1; // 使用前面铸造的代币
                        const tx = await iotSFT.connect(users[0]).splitValue(
                            tokenId, 
                            50, 
                            users[1].address
                        );
                        const receipt = await tx.wait();
                        results.split.count++;
                        results.split.totalGas += receipt!.gasUsed;
                        
                    } else {
                        // 合并操作
                        const fromTokenId = (i % 5) + 1;
                        const toTokenId = ((i + 1) % 5) + 1;
                        
                        // 检查是否可以合并
                        const fromSlot = await iotSFT.slotOf(fromTokenId);
                        const toSlot = await iotSFT.slotOf(toTokenId);
                        
                        if (fromSlot === toSlot) {
                            const tx = await iotSFT.connect(users[0]).mergeValue(
                                fromTokenId, 
                                toTokenId, 
                                30
                            );
                            const receipt = await tx.wait();
                            results.merge.count++;
                            results.merge.totalGas += receipt!.gasUsed;
                        }
                    }
                    
                    if ((i + 1) % 10 === 0) {
                        console.log(`   ✅ 已完成 ${i + 1}/${operationCount} 个操作`);
                    }
                    
                } catch (error) {
                    console.log(`   ⚠️ 操作 ${i + 1} 失败: ${error}`);
                }
            }
            
            const endTime = Date.now();
            
            console.log(`📊 混合操作序列结果:`);
            console.log(`   总耗时: ${endTime - startTime}ms`);
            console.log(`   铸造操作: ${results.mint.count} 次, 平均Gas: ${results.mint.count > 0 ? (Number(results.mint.totalGas) / results.mint.count).toFixed(0) : 0}`);
            console.log(`   分割操作: ${results.split.count} 次, 平均Gas: ${results.split.count > 0 ? (Number(results.split.totalGas) / results.split.count).toFixed(0) : 0}`);
            console.log(`   合并操作: ${results.merge.count} 次, 平均Gas: ${results.merge.count > 0 ? (Number(results.merge.totalGas) / results.merge.count).toFixed(0) : 0}`);
            
            const totalOperations = results.mint.count + results.split.count + results.merge.count;
            expect(totalOperations).to.be.greaterThan(operationCount * 0.8); // 至少80%操作成功
        });
    });

    describe("压力测试", function () {
        it("极限条件下的系统稳定性", async function () {
            console.log("🔥 开始压力测试...");
            
            const stressOperations = [];
            
            // 创建大量并发操作
            for (let i = 0; i < STRESS_TEST_SIZE; i++) {
                const operationType = i % 4;
                
                if (operationType === 0) {
                    // 铸造
                    stressOperations.push(
                        iotSFT.connect(owner).mint(
                            users[i % users.length].address, 
                            i % 2, 
                            100
                        ).then(tx => tx.wait()).then(receipt => ({
                            type: 'mint',
                            success: true,
                            gasUsed: receipt!.gasUsed
                        })).catch(error => ({
                            type: 'mint',
                            success: false,
                            error: error.message
                        }))
                    );
                }
            }
            
            console.log(`   执行 ${stressOperations.length} 个并发操作...`);
            const startTime = Date.now();
            
            const results = await Promise.allSettled(stressOperations);
            const endTime = Date.now();
            
            // 分析压力测试结果
            const successful = results.filter(r => 
                r.status === 'fulfilled' && r.value.success
            ).length;
            const failed = results.length - successful;
            
            console.log(`📊 压力测试结果:`);
            console.log(`   总操作数: ${results.length}`);
            console.log(`   成功操作: ${successful}`);
            console.log(`   失败操作: ${failed}`);
            console.log(`   成功率: ${(successful / results.length * 100).toFixed(1)}%`);
            console.log(`   总耗时: ${endTime - startTime}ms`);
            console.log(`   平均操作时间: ${((endTime - startTime) / results.length).toFixed(1)}ms`);
            
            // 压力测试基本要求
            expect(successful).to.be.greaterThan(0);
            expect(successful / results.length).to.be.greaterThan(0.5); // 至少50%成功率
        });
    });
});
