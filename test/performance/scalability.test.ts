import { expect } from "chai";
import { ethers } from "hardhat";
import type { IoTSFT } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Scalability Tests", function () {
    let iotSFT: IoTSFT;
    let owner: SignerWithAddress;
    let users: SignerWithAddress[];

    // Scalability test configuration
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
        
        console.log(`🏗️ Scalability test environment setup complete`);
    });

    describe("Large Scale Minting Tests", function () {
        it("Continuous minting of large quantities of tokens", async function () {
            console.log(`🏭 Starting large scale minting test (${LARGE_BATCH_SIZE} tokens)...`);
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
                
                // Report progress every 10 tokens
                if ((i + 1) % 10 === 0) {
                    console.log(`   ✅ Minted ${i + 1}/${LARGE_BATCH_SIZE} tokens`);
                }
            }
            
            const endTime = Date.now();
            const totalDuration = endTime - startTime;
            
            console.log(`📊 Large scale minting results:`);
            console.log(`   Token count: ${LARGE_BATCH_SIZE}`);
            console.log(`   Total duration: ${totalDuration}ms`);
            console.log(`   Average per token: ${(totalDuration / LARGE_BATCH_SIZE).toFixed(1)}ms`);
            console.log(`   Total gas consumption: ${totalGasUsed.toString()}`);
            console.log(`   Average gas consumption: ${(Number(totalGasUsed) / LARGE_BATCH_SIZE).toFixed(0)}`);
            
            // Verify all tokens were minted correctly
            for (let i = 0; i < LARGE_BATCH_SIZE; i++) {
                const balance = await iotSFT["balanceOf(uint256)"](i + 1);
                expect(balance).to.equal(100 + (i * 10));
            }
            
            // Performance benchmark checks
            expect(totalDuration).to.be.lessThan(120000); // Total duration should be less than 2 minutes
            const avgGasPerToken = Number(totalGasUsed) / LARGE_BATCH_SIZE;
            expect(avgGasPerToken).to.be.lessThan(250000); // Average gas should be reasonable
        });

        it("Device type scalability minting comparison", async function () {
            console.log("🔄 Device type scalability minting comparison test...");
            
            const deviceTypes = [0, 1]; // TemperatureSensor, CrowdDensitySensor
            const results: any = {};
            
            for (const deviceType of deviceTypes) {
                console.log(`   Testing device type ${deviceType}...`);
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
            
            console.log(`📊 Device type comparison results:`);
            deviceTypes.forEach(type => {
                console.log(`   Device type ${type}:`);
                console.log(`     Duration: ${results[type].duration}ms`);
                console.log(`     Average gas: ${results[type].avgGas.toFixed(0)}`);
            });
            
            // Verify that performance differences between device types should be minimal
            const gasRatio = results[0].avgGas / results[1].avgGas;
            expect(gasRatio).to.be.closeTo(1.0, 0.1); // Gas consumption difference should be less than 10%
        });
    });

    describe("Large-scale splitting test", function () {
        beforeEach(async function () {
            // Prepare a high-value token for splitting test
            await iotSFT.connect(owner).mint(users[0].address, 0, 10000);
        });

        it("Multiple consecutive splits", async function () {
            console.log(`✂️ Starting large-scale splitting test...`);
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
                    console.log(`   ✅ Completed split ${i + 1}/${splitCount}`);
                }
                
                // Verify original token balance decreases
                const remainingBalance = await iotSFT["balanceOf(uint256)"](1);
                const expectedBalance = 10000 - (splitAmount * (i + 1));
                expect(remainingBalance).to.equal(expectedBalance);
            }
            
            const endTime = Date.now();
            
            console.log(`📊 Large-scale splitting results:`);
            console.log(`   Split count: ${splitCount}`);
            console.log(`   总耗时: ${endTime - startTime}ms`);
            console.log(`   平均每次分割: ${((endTime - startTime) / splitCount).toFixed(1)}ms`);
            console.log(`   平均Gas Consumption: ${(Number(totalGas) / splitCount).toFixed(0)}`);
            
            // 验证Generate了正确数量的新代币
            for (let i = 2; i <= splitCount + 1; i++) {
                const balance = await iotSFT["balanceOf(uint256)"](i);
                expect(balance).to.equal(splitAmount);
            }
        });

        it("分割Operation的Gas Consumption趋势Analysis", async function () {
            console.log("📈 分割OperationGas Consumption趋势Analysis...");
            
            const splitCount = 15;
            const gasHistory: number[] = [];
            
            for (let i = 0; i < splitCount; i++) {
                const tx = await iotSFT.connect(users[0]).splitValue(1, 50, users[1].address);
                const receipt = await tx.wait();
                gasHistory.push(Number(receipt!.gasUsed));
            }
            
            // AnalysisGas Consumption趋势
            console.log(`📊 Gas Consumption趋势:`);
            console.log(`   第1次分割: ${gasHistory[0]} Gas`);
            console.log(`   第${splitCount}次分割: ${gasHistory[splitCount - 1]} Gas`);
            
            const avgGas = gasHistory.reduce((sum, gas) => sum + gas, 0) / gasHistory.length;
            const maxGas = Math.max(...gasHistory);
            const minGas = Math.min(...gasHistory);
            
            console.log(`   平均Gas: ${avgGas.toFixed(0)}`);
            console.log(`   最大Gas: ${maxGas}`);
            console.log(`   最小Gas: ${minGas}`);
            console.log(`   Gas变化幅度: ${((maxGas - minGas) / avgGas * 100).toFixed(1)}%`);
            
            // 验证Gas Consumption相对稳定
            expect((maxGas - minGas) / avgGas).to.be.lessThan(0.15); // 变化幅度应小于15%
        });
    });

    describe("复杂Operation序列Test", function () {
        it("大规模混合Operation序列", async function () {
            console.log("🔀 Start大规模混合Operation序列Test...");
            
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
                const operationType = i % 3; // 循环执行三种Operation
                
                try {
                    if (operationType === 0) {
                        // 铸造Operation
                        const tx = await iotSFT.connect(owner).mint(
                            users[i % users.length].address, 
                            i % 2, 
                            200 + i
                        );
                        const receipt = await tx.wait();
                        results.mint.count++;
                        results.mint.totalGas += receipt!.gasUsed;
                        
                    } else if (operationType === 1) {
                        // 分割Operation
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
                        // 合并Operation
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
                        console.log(`   ✅ 已Complete ${i + 1}/${operationCount} 个Operation`);
                    }
                    
                } catch (error) {
                    console.log(`   ⚠️ Operation ${i + 1} 失败: ${error}`);
                }
            }
            
            const endTime = Date.now();
            
            console.log(`📊 混合Operation序列Result:`);
            console.log(`   总耗时: ${endTime - startTime}ms`);
            console.log(`   铸造Operation: ${results.mint.count} 次, 平均Gas: ${results.mint.count > 0 ? (Number(results.mint.totalGas) / results.mint.count).toFixed(0) : 0}`);
            console.log(`   分割Operation: ${results.split.count} 次, 平均Gas: ${results.split.count > 0 ? (Number(results.split.totalGas) / results.split.count).toFixed(0) : 0}`);
            console.log(`   合并Operation: ${results.merge.count} 次, 平均Gas: ${results.merge.count > 0 ? (Number(results.merge.totalGas) / results.merge.count).toFixed(0) : 0}`);
            
            const totalOperations = results.mint.count + results.split.count + results.merge.count;
            expect(totalOperations).to.be.greaterThan(operationCount * 0.8); // 至少80%Operation成功
        });
    });

    describe("压力Test", function () {
        it("极限条件下的系统稳定性", async function () {
            console.log("🔥 Start压力Test...");
            
            const stressOperations = [];
            
            // 创建大量并发Operation
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
            
            console.log(`   执行 ${stressOperations.length} 个并发Operation...`);
            const startTime = Date.now();
            
            const results = await Promise.allSettled(stressOperations);
            const endTime = Date.now();
            
            // Analysis压力TestResult
            const successful = results.filter(r => 
                r.status === 'fulfilled' && r.value.success
            ).length;
            const failed = results.length - successful;
            
            console.log(`📊 压力TestResult:`);
            console.log(`   总Operation数: ${results.length}`);
            console.log(`   成功Operation: ${successful}`);
            console.log(`   失败Operation: ${failed}`);
            console.log(`   Success Rate: ${(successful / results.length * 100).toFixed(1)}%`);
            console.log(`   总耗时: ${endTime - startTime}ms`);
            console.log(`   平均Operation时间: ${((endTime - startTime) / results.length).toFixed(1)}ms`);
            
            // 压力Test基本要求
            expect(successful).to.be.greaterThan(0);
            expect(successful / results.length).to.be.greaterThan(0.5); // 至少50%Success Rate
        });
    });
});
