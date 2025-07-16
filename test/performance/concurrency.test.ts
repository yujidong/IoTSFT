import { expect } from "chai";
import { ethers } from "hardhat";
import type { IoTSFT } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Concurrency Performance Tests", function () {
    let iotSFT: IoTSFT;
    let owner: SignerWithAddress;
    let users: SignerWithAddress[];

    // 并发测试配置
    const CONCURRENT_USERS = 10;
    const OPERATIONS_PER_USER = 5;
    const INITIAL_TOKEN_VALUE = 1000;

    beforeEach(async function () {
        const signers = await ethers.getSigners();
        owner = signers[0];
        users = signers.slice(1, CONCURRENT_USERS + 1);
        
        const IoTSFTFactory = await ethers.getContractFactory("IoTSFT");
        iotSFT = await IoTSFTFactory.deploy("IoT SFT", "IOTSFT", 18);
        await iotSFT.waitForDeployment();
        
        console.log(`🚀 准备并发测试，用户数: ${CONCURRENT_USERS}`);
    });

    describe("并发铸造测试", function () {
        it("多用户同时铸造代币", async function () {
            console.log("🔄 开始并发铸造测试...");
            const startTime = Date.now();
            
            // 创建并发铸造任务
            const mintPromises = users.map(async (user, index) => {
                const deviceType = index % 2; // 交替使用两种设备类型
                const value = INITIAL_TOKEN_VALUE + index * 10; // 每个用户不同的价值
                
                const userStartTime = Date.now();
                const tx = await iotSFT.connect(owner).mint(user.address, deviceType, value);
                const receipt = await tx.wait();
                const userEndTime = Date.now();
                
                return {
                    user: user.address,
                    tokenId: index + 1,
                    value: value,
                    gasUsed: receipt!.gasUsed,
                    duration: userEndTime - userStartTime,
                    blockNumber: receipt!.blockNumber
                };
            });
            
            // 等待所有铸造完成
            const results = await Promise.all(mintPromises);
            const endTime = Date.now();
            const totalDuration = endTime - startTime;
            
            console.log(`📊 并发铸造结果:`);
            console.log(`   总耗时: ${totalDuration}ms`);
            console.log(`   成功交易: ${results.length}/${CONCURRENT_USERS}`);
            
            // 分析结果
            const totalGas = results.reduce((sum, r) => sum + Number(r.gasUsed), 0);
            const avgGas = totalGas / results.length;
            const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
            
            console.log(`   平均Gas消耗: ${avgGas.toFixed(0)}`);
            console.log(`   平均交易时间: ${avgDuration.toFixed(0)}ms`);
            
            // 验证所有代币都被正确铸造
            for (const result of results) {
                const balance = await iotSFT["balanceOf(uint256)"](result.tokenId);
                expect(balance).to.equal(result.value);
            }
            
            // 性能基准检查
            expect(totalDuration).to.be.lessThan(30000); // 总耗时应少于30秒
            expect(avgGas).to.be.lessThan(300000); // 平均Gas应合理
        });
    });

    describe("并发分割测试", function () {
        beforeEach(async function () {
            // 为每个用户预先铸造代币
            for (let i = 0; i < users.length; i++) {
                await iotSFT.connect(owner).mint(users[i].address, 0, INITIAL_TOKEN_VALUE);
            }
        });

        it("多用户同时分割代币", async function () {
            console.log("✂️ 开始并发分割测试...");
            const startTime = Date.now();
            
            // 创建并发分割任务
            const splitPromises = users.map(async (user, index) => {
                const tokenId = index + 1;
                const splitAmount = 100 + index * 10; // 每个用户不同的分割数量
                const recipient = users[(index + 1) % users.length]; // 循环指定接收者
                
                const userStartTime = Date.now();
                const tx = await iotSFT.connect(user).splitValue(tokenId, splitAmount, recipient.address);
                const receipt = await tx.wait();
                const userEndTime = Date.now();
                
                return {
                    user: user.address,
                    originalTokenId: tokenId,
                    splitAmount: splitAmount,
                    recipient: recipient.address,
                    gasUsed: receipt!.gasUsed,
                    duration: userEndTime - userStartTime,
                    transactionHash: receipt!.hash
                };
            });
            
            // 等待所有分割完成
            const results = await Promise.all(splitPromises);
            const endTime = Date.now();
            
            console.log(`📊 并发分割结果:`);
            console.log(`   总耗时: ${endTime - startTime}ms`);
            console.log(`   成功交易: ${results.length}/${users.length}`);
            
            // 验证分割结果
            for (const result of results) {
                const originalBalance = await iotSFT["balanceOf(uint256)"](result.originalTokenId);
                const expectedBalance = INITIAL_TOKEN_VALUE - result.splitAmount;
                expect(originalBalance).to.equal(expectedBalance);
            }
            
            // 计算性能指标
            const avgGas = results.reduce((sum, r) => sum + Number(r.gasUsed), 0) / results.length;
            const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
            
            console.log(`   平均Gas消耗: ${avgGas.toFixed(0)}`);
            console.log(`   平均交易时间: ${avgDuration.toFixed(0)}ms`);
        });
    });

    describe("混合操作并发测试", function () {
        beforeEach(async function () {
            // 为测试准备一些代币
            for (let i = 0; i < Math.min(users.length, 5); i++) {
                await iotSFT.connect(owner).mint(users[i].address, 0, INITIAL_TOKEN_VALUE);
                await iotSFT.connect(owner).mint(users[i].address, 1, INITIAL_TOKEN_VALUE);
            }
        });

        it("混合操作并发执行", async function () {
            console.log("🔀 开始混合操作并发测试...");
            const startTime = Date.now();
            
            const operations: Promise<any>[] = [];
            
            // 添加铸造操作
            for (let i = 0; i < 3; i++) {
                operations.push(
                    iotSFT.connect(owner).mint(users[i + 5].address, i % 2, 500)
                        .then(tx => tx.wait())
                        .then(receipt => ({ type: 'mint', gasUsed: receipt!.gasUsed }))
                );
            }
            
            // 添加分割操作
            for (let i = 0; i < 3; i++) {
                operations.push(
                    iotSFT.connect(users[i]).splitValue(i * 2 + 1, 100, users[i + 1].address)
                        .then(tx => tx.wait())
                        .then(receipt => ({ type: 'split', gasUsed: receipt!.gasUsed }))
                );
            }
            
            // 添加合并操作
            for (let i = 0; i < 2; i++) {
                operations.push(
                    iotSFT.connect(users[i]).mergeValue(i * 2 + 1, i * 2 + 2, 50)
                        .then(tx => tx.wait())
                        .then(receipt => ({ type: 'merge', gasUsed: receipt!.gasUsed }))
                );
            }
            
            // 执行所有操作
            const results = await Promise.allSettled(operations);
            const endTime = Date.now();
            
            console.log(`📊 混合操作结果:`);
            console.log(`   总耗时: ${endTime - startTime}ms`);
            console.log(`   总操作数: ${operations.length}`);
            
            // 分析成功和失败的操作
            const successful = results.filter(r => r.status === 'fulfilled');
            const failed = results.filter(r => r.status === 'rejected');
            
            console.log(`   成功操作: ${successful.length}`);
            console.log(`   失败操作: ${failed.length}`);
            
            if (failed.length > 0) {
                console.log(`   失败原因:`);
                failed.forEach((failure, index) => {
                    if (failure.status === 'rejected') {
                        console.log(`     ${index + 1}: ${failure.reason.message}`);
                    }
                });
            }
            
            // 按操作类型分析Gas消耗
            const successfulResults = successful.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
            const operationTypes = ['mint', 'split', 'merge'];
            
            operationTypes.forEach(type => {
                const typeResults = successfulResults.filter(r => r.type === type);
                if (typeResults.length > 0) {
                    const avgGas = typeResults.reduce((sum, r) => sum + Number(r.gasUsed), 0) / typeResults.length;
                    console.log(`   ${type} 平均Gas: ${avgGas.toFixed(0)}`);
                }
            });
            
            // 性能要求验证
            expect(successful.length).to.be.greaterThan(operations.length * 0.8); // 至少80%成功率
        });
    });

    describe("网络拥堵模拟测试", function () {
        it("高频操作下的系统表现", async function () {
            console.log("🚦 开始网络拥堵模拟测试...");
            
            // 准备测试代币
            await iotSFT.connect(owner).mint(users[0].address, 0, 10000);
            
            const operationCount = 20;
            const batchSize = 5;
            const results: any[] = [];
            
            // 分批执行高频操作
            for (let batch = 0; batch < operationCount / batchSize; batch++) {
                console.log(`   执行批次 ${batch + 1}/${operationCount / batchSize}`);
                
                const batchPromises = [];
                for (let i = 0; i < batchSize; i++) {
                    const operation = iotSFT.connect(users[0]).splitValue(
                        1, 
                        10, 
                        users[1].address
                    );
                    batchPromises.push(operation);
                }
                
                const batchStartTime = Date.now();
                try {
                    const batchResults = await Promise.allSettled(batchPromises.map(p => p.then(tx => tx.wait())));
                    const batchEndTime = Date.now();
                    
                    results.push({
                        batch: batch + 1,
                        duration: batchEndTime - batchStartTime,
                        successful: batchResults.filter(r => r.status === 'fulfilled').length,
                        failed: batchResults.filter(r => r.status === 'rejected').length
                    });
                    
                    // 批次间短暂延迟，模拟真实使用场景
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.log(`   批次 ${batch + 1} 执行出错:`, error);
                }
            }
            
            // 分析拥堵测试结果
            console.log(`📊 拥堵测试结果:`);
            const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0);
            const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
            const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
            
            console.log(`   总成功操作: ${totalSuccessful}`);
            console.log(`   总失败操作: ${totalFailed}`);
            console.log(`   平均批次耗时: ${avgDuration.toFixed(0)}ms`);
            console.log(`   成功率: ${(totalSuccessful / (totalSuccessful + totalFailed) * 100).toFixed(1)}%`);
            
            // 验证系统在高负载下的稳定性
            expect(totalSuccessful).to.be.greaterThan(0);
            expect(totalSuccessful / (totalSuccessful + totalFailed)).to.be.greaterThan(0.7); // 至少70%成功率
        });
    });
});
