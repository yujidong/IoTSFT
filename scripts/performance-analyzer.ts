import { ethers } from "hardhat";
import type { IoTSFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import fs from "fs-extra";
import path from "path";

export interface PerformanceMetrics {
    operation: string;
    scale: number;
    times: number[];
    gas: number[];
    timestamps: number[];
    avgTime: number;
    avgGas: number;
    minTime: number;
    maxTime: number;
    throughput: number; // 理论Throughput：基于平均Response Time的每秒Operation数
    actualThroughput?: number; // 实际TestThroughput：基于总时间的实际Operation速率
    operationCount?: number; // 实际执行的Operation数量
}

export interface ScalingTestResults {
    testName: string;
    timestamp: string;
    environment: string;
    metrics: PerformanceMetrics[];
    summary: {
        totalOperations: number;
        totalTime: number;
        totalGas: bigint;
        avgThroughput: number;
    };
}

export class PerformanceAnalyzer {
    private contract: IoTSFT;
    private signer: SignerWithAddress;
    private outputDir: string;
    private tokenCounter: number = 1; // 跟踪token ID

    constructor(contract: IoTSFT, signer: SignerWithAddress) {
        this.contract = contract;
        this.signer = signer;
        this.outputDir = path.join(process.cwd(), 'performance-reports');
        this.ensureOutputDir();
    }

    private async ensureOutputDir(): Promise<void> {
        await fs.ensureDir(this.outputDir);
        await fs.ensureDir(path.join(this.outputDir, 'data'));
        await fs.ensureDir(path.join(this.outputDir, 'charts'));
        await fs.ensureDir(path.join(this.outputDir, 'reports'));
    }

    /**
     * 执行scalingPerformanceTest
     */
    async runScalingTest(scales: number[] = [10, 50, 100, 500]): Promise<ScalingTestResults> {
        console.log('🚀 StartScalingPerformanceTest...');
        console.log(`📊 Test规模: ${scales.join(', ')}`);

        const testStartTime = Date.now();
        const metrics: PerformanceMetrics[] = [];
        let totalOperations = 0;
        let totalGas = BigInt(0);

        // 准备Test环境
        console.log('📋 准备Test环境...');

        // 对每个规模进行Test
        for (const scale of scales) {
            console.log(`\n🧪 Test规模: ${scale} 个Operation`);
            
            // 主要TestmintOperation（最重要的核心功能）
            const mintMetrics = await this.testMintPerformance(scale);
            metrics.push(mintMetrics);
            
            // split和mergeTest（所有规模都进行Test，但限制实际Operation数量）
            try {
                // SplitTest：根据规模调整Test数量，但保证所有规模都有Test
                const splitTestScale = Math.min(50, Math.max(10, Math.floor(scale / 20)));
                const splitMetrics = await this.testSplitPerformance(splitTestScale, scale);
                metrics.push(splitMetrics);
            } catch (error) {
                console.log(`⚠️ SplitTest跳过: ${error}`);
            }
            
            try {
                // MergeTest：根据规模调整Test数量，确保token配对成功
                const mergeTestScale = Math.min(20, Math.max(5, Math.floor(scale / 50)));
                const mergeMetrics = await this.testMergePerformance(mergeTestScale, scale);
                metrics.push(mergeMetrics);
            } catch (error) {
                console.log(`⚠️ MergeTest跳过: ${error}`);
            }

            totalOperations += mintMetrics.times.length;
            totalGas += BigInt(mintMetrics.gas.reduce((a, b) => a + b, 0));
        }

        const testEndTime = Date.now();
        const totalTime = testEndTime - testStartTime;
        const avgThroughput = (totalOperations / totalTime) * 1000; // ops per second

        const results: ScalingTestResults = {
            testName: 'IoT-SFT Scaling Performance Test',
            timestamp: new Date().toISOString(),
            environment: 'Local Hardhat Network',
            metrics,
            summary: {
                totalOperations,
                totalTime,
                totalGas,
                avgThroughput
            }
        };

        // 保存TestResult
        await this.saveResults(results);
        console.log('\n✅ ScalingTestComplete!');
        console.log(`📊 总Operation数: ${totalOperations}`);
        console.log(`⏱️ 总耗时: ${totalTime}ms`);
        console.log(`⛽ 总Gas Consumption: ${totalGas.toString()}`);
        console.log(`🚀 平均Throughput: ${avgThroughput.toFixed(2)} ops/sec`);

        return results;
    }

    /**
     * Test铸造OperationPerformance
     */
    private async testMintPerformance(count: number): Promise<PerformanceMetrics> {
        console.log(`  🔨 Test铸造Performance (${count} 次Operation)...`);
        
        const times: number[] = [];
        const gas: number[] = [];
        const timestamps: number[] = [];

        for (let i = 0; i < count; i++) {
            const start = Date.now();
            const startTimestamp = performance.now();
            
            // 使用固定的deviceType 0 确保与后续split/mergeTest一致
            const tx = await this.contract.mint(this.signer.address, 0, 100);
            const receipt = await tx.wait();
            this.tokenCounter++; // 增加token计数器
            
            const end = Date.now();
            const endTimestamp = performance.now();
            
            times.push(end - start);
            gas.push(Number(receipt!.gasUsed));
            timestamps.push(endTimestamp - startTimestamp);

            if ((i + 1) % Math.max(1, Math.floor(count / 10)) === 0) {
                console.log(`    📈 进度: ${i + 1}/${count}`);
            }
        }

        return this.calculateMetrics('mint', count, times, gas, timestamps);
    }

    /**
     * Test分割OperationPerformance
     */
    private async testSplitPerformance(count: number, reportedScale?: number): Promise<PerformanceMetrics> {
        console.log(`  ✂️ Test分割Performance (${count} 次Operation)...`);
        
        const times: number[] = [];
        const gas: number[] = [];
        const timestamps: number[] = [];

        // 为分割Test准备代币，使用固定的deviceType确保一致性
        const splitTokenIds: number[] = [];
        const deviceType = 0; // 使用固定的deviceType
        
        console.log(`    🔧 准备${count}个token (deviceType: ${deviceType})...`);
        for (let i = 0; i < count; i++) {
            const tx = await this.contract.mint(this.signer.address, deviceType, 1000);
            await tx.wait();
            splitTokenIds.push(this.tokenCounter++);
        }

        console.log(`    ✅ 准备Complete，StartsplitTest...`);
        // 执行分割Test
        for (let i = 0; i < count; i++) {
            const start = Date.now();
            const startTimestamp = performance.now();
            
            const tokenId = splitTokenIds[i];
            const tx = await this.contract.splitValue(tokenId, 100, this.signer.address);
            const receipt = await tx.wait();
            
            const end = Date.now();
            const endTimestamp = performance.now();
            
            times.push(end - start);
            gas.push(Number(receipt!.gasUsed));
            timestamps.push(endTimestamp - startTimestamp);
        }

        return this.calculateMetrics('split', reportedScale || count, times, gas, timestamps);
    }

    /**
     * Test合并OperationPerformance
     */
    private async testMergePerformance(count: number, reportedScale?: number): Promise<PerformanceMetrics> {
        console.log(`  🔄 Test合并Performance (${count} 次Operation)...`);
        
        const times: number[] = [];
        const gas: number[] = [];
        const timestamps: number[] = [];

        // 为合并Test准备成对的代币 - 确保使用相同的slot
        const tokenPairs: { fromToken: number, toToken: number }[] = [];
        const deviceType = 0; // 固定使用deviceType 0，确保相同slot
        
        // 准备阶段：先创建所有需要的token pairs
        console.log(`    🔧 准备${count}对token (相同slot: ${deviceType})...`);
        for (let i = 0; i < count; i++) {
            try {
                // 铸造第一个token (fromToken) - 100个单位
                const fromTokenTx = await this.contract.mint(this.signer.address, deviceType, 100);
                await fromTokenTx.wait();
                const fromTokenId = this.tokenCounter++;
                
                // 铸造第二个token (toToken) - 50个单位，确保使用相同的deviceType
                const toTokenTx = await this.contract.mint(this.signer.address, deviceType, 50);
                await toTokenTx.wait();
                const toTokenId = this.tokenCounter++;
                
                tokenPairs.push({ fromToken: fromTokenId, toToken: toTokenId });
            } catch (error) {
                console.log(`⚠️ 准备token pair ${i+1}失败: ${error}`);
            }
        }

        console.log(`    ✅ 成功准备${tokenPairs.length}对token，StartmergeTest...`);

        // 执行阶段：执行合并Test
        let successCount = 0;
        for (let i = 0; i < tokenPairs.length; i++) {
            const start = Date.now();
            const startTimestamp = performance.now();
            
            const { fromToken, toToken } = tokenPairs[i];
            const mergeAmount = 30; // 合并30个单位的value
            
            try {
                // 验证两个token确实在相同slot中
                const fromSlot = await this.contract.slotOf(fromToken);
                const toSlot = await this.contract.slotOf(toToken);
                
                if (fromSlot !== toSlot) {
                    console.log(`⚠️ Slot不匹配: ${fromToken}(slot:${fromSlot}) -> ${toToken}(slot:${toSlot})`);
                    continue;
                }

                const tx = await this.contract.mergeValue(fromToken, toToken, mergeAmount);
                const receipt = await tx.wait();
                
                const end = Date.now();
                const endTimestamp = performance.now();
                
                times.push(end - start);
                gas.push(Number(receipt!.gasUsed));
                timestamps.push(endTimestamp - startTimestamp);
                successCount++;
                
            } catch (error) {
                console.log(`⚠️ MergeOperation失败 (${fromToken} -> ${toToken}): ${error}`);
            }
        }

        console.log(`    ✅ MergeTestComplete: ${successCount}/${tokenPairs.length} 成功`);

        // 如果没有成功的Operation，返回默认值
        if (times.length === 0) {
            times.push(0);
            gas.push(0);
            timestamps.push(0);
        }

        return this.calculateMetrics('merge', reportedScale || count, times, gas, timestamps);
    }

    /**
     * 计算Performance指标
     */
    private calculateMetrics(
        operation: string, 
        scale: number, 
        times: number[], 
        gas: number[], 
        timestamps: number[]
    ): PerformanceMetrics {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const avgGas = gas.reduce((a, b) => a + b, 0) / gas.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        // 修复Throughput计算：基于单Operation平均时间的理论Throughput
        // 这表示如果连续执行此Operation，每秒能Complete多少次
        const theoreticalThroughput = avgTime > 0 ? (1000 / avgTime) : 0;
        
        // 实际TestThroughput：基于实际执行的Operation数和总时间
        const totalTime = times.reduce((a, b) => a + b, 0);
        const actualThroughput = totalTime > 0 ? (times.length * 1000 / totalTime) : 0;

        return {
            operation,
            scale,
            times,
            gas,
            timestamps,
            avgTime,
            avgGas,
            minTime,
            maxTime,
            throughput: theoreticalThroughput, // 使用理论Throughput，更公平的比较
            actualThroughput, // 新增：实际TestThroughput
            operationCount: times.length // 新增：实际Operation数量
        };
    }

    /**
     * 准备Test环境
     */
    private async prepareTestEnvironment(): Promise<void> {
        // 确保有足够的初始代币
        await this.contract.mint(this.signer.address, 0, 10000);
        await this.contract.mint(this.signer.address, 1, 10000);
    }

    /**
     * 保存TestResult到文件
     */
    private async saveResults(results: ScalingTestResults): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `scaling-test-${timestamp}.json`;
        const filepath = path.join(this.outputDir, 'data', filename);
        
        // 转换BigInt为字符串，避免JSON序列化问题
        const serializableResults = {
            ...results,
            summary: {
                ...results.summary,
                totalGas: results.summary.totalGas.toString()
            }
        };
        
        await fs.writeJSON(filepath, serializableResults, { spaces: 2 });
        console.log(`💾 TestResults saved到: ${filepath}`);
    }

    /**
     * 并发PerformanceTest
     */
    async runConcurrencyTest(userCount: number = 5, opsPerUser: number = 10): Promise<any> {
        console.log(`🔄 Start并发PerformanceTest (${userCount} 用户, 每用户 ${opsPerUser} Operation)...`);
        
        const startTime = Date.now();
        const results: any[] = [];

        // 创建并发任务
        const promises = Array.from({ length: userCount }, async (_, userIndex) => {
            const userResults = [];
            
            for (let opIndex = 0; opIndex < opsPerUser; opIndex++) {
                const opStart = Date.now();
                const tx = await this.contract.mint(
                    this.signer.address, 
                    userIndex % 2, 
                    100 + userIndex * 10
                );
                const receipt = await tx.wait();
                const opEnd = Date.now();
                
                userResults.push({
                    user: userIndex,
                    operation: opIndex,
                    duration: opEnd - opStart,
                    gasUsed: Number(receipt!.gasUsed),
                    blockNumber: receipt!.blockNumber
                });
            }
            
            return userResults;
        });

        // 等待所有并发OperationComplete
        const allResults = await Promise.all(promises);
        const endTime = Date.now();
        
        const flatResults = allResults.flat();
        const totalTime = endTime - startTime;
        const avgTime = flatResults.reduce((sum, r) => sum + r.duration, 0) / flatResults.length;
        const totalGas = flatResults.reduce((sum, r) => sum + r.gasUsed, 0);
        
        console.log(`✅ 并发TestComplete:`);
        console.log(`  总耗时: ${totalTime}ms`);
        console.log(`  平均Operation时间: ${avgTime.toFixed(1)}ms`);
        console.log(`  总Gas Consumption: ${totalGas}`);
        console.log(`  并发Throughput: ${(flatResults.length / totalTime * 1000).toFixed(2)} ops/sec`);

        return {
            testType: 'concurrency',
            userCount,
            opsPerUser,
            totalTime,
            avgTime,
            totalGas,
            throughput: flatResults.length / totalTime * 1000,
            results: flatResults
        };
    }

    /**
     * 快速PerformanceTest
     */
    async runQuickTest(operationsCount: number = 100): Promise<{
        totalOperations: number;
        totalTime: number;
        averageGas: number;
        tps: number;
    }> {
        console.log(`🚀 Start快速PerformanceTest (${operationsCount}次Operation)...`);
        
        const startTime = Date.now();
        const results: { duration: number; gasUsed: number }[] = [];
        
        // 执行mintOperationTest
        for (let i = 0; i < operationsCount; i++) {
            const opStart = Date.now();
            const tx = await this.contract.mint(
                this.signer.address,
                i % 2, // 交替使用DeviceType
                ethers.parseEther("1.0")
            );
            const receipt = await tx.wait();
            const opEnd = Date.now();
            
            results.push({
                duration: opEnd - opStart,
                gasUsed: Number(receipt!.gasUsed)
            });
            
            // 进度显示 - 大规模Test时减少输出频率
            const progressInterval = operationsCount >= 100 ? 25 : (operationsCount >= 50 ? 10 : 5);
            if ((i + 1) % progressInterval === 0 || (i + 1) === operationsCount) {
                console.log(`    📈 进度: ${i + 1}/${operationsCount}`);
            }
        }
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const averageGas = results.reduce((sum, r) => sum + r.gasUsed, 0) / results.length;
        const tps = operationsCount / (totalTime / 1000);
        
        return {
            totalOperations: operationsCount,
            totalTime,
            averageGas,
            tps
        };
    }
}

/**
 * 获取本地合约实例进行Test
 */
export async function getLocalContract(): Promise<{ contract: IoTSFT; signer: SignerWithAddress }> {
    const [signer] = await ethers.getSigners();
    const IoTSFTFactory = await ethers.getContractFactory("IoTSFT");
    
    // 部署新的合约实例用于Test
    const contract = await IoTSFTFactory.deploy("IoT SFT Test", "IOTSFT", 18);
    await contract.waitForDeployment();
    
    console.log(`📍 Test合约地址: ${await contract.getAddress()}`);
    
    return { contract, signer };
}
