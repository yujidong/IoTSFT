import { ethers } from "hardhat";
import type { IoTSFT } from "../typechain-types";
import dotenv from "dotenv";
import { Command } from "commander";

// Load environment variables
dotenv.config();

// Create CLI program
const program = new Command();

// Helper function: Get contract instance
async function getContract() {
    const contractAddress = process.env.CONTRACT_ADDRESS_SEPOLIA;
    if (!contractAddress) {
        throw new Error("❌ Contract address not found, please set CONTRACT_ADDRESS_SEPOLIA in .env file");
    }
    
    const [signer] = await ethers.getSigners();
    const IoTSFTFactory = await ethers.getContractFactory("IoTSFT");
    const contract = IoTSFTFactory.attach(contractAddress).connect(signer) as IoTSFT;
    
    return { contract, signer, contractAddress };
}

// Helper function: Format output
function formatTokenInfo(tokenId: number, balance: bigint, slot: bigint, owner: string) {
    console.log(`🎫 Token #${tokenId}:`);
    console.log(`   💰 Balance: ${balance.toString()}`);
    console.log(`   🎰 Slot: ${slot.toString()} (${slot.toString() === '0' ? 'Temperature sensor' : 'Crowd density sensor'})`);
    console.log(`   👤 Owner: ${owner}`);
}

// Program basic information
program
    .name('iot-sft-cli')
    .description('IoT SFT Smart Contract CLI Tool')
    .version('1.0.0');

// Deploy command
program
    .command('deploy')
    .description('Deploy IoTSFT contract')
    .option('-n, --name <name>', 'Contract name', 'IoT Semi-Fungible Token')
    .option('-s, --symbol <symbol>', 'Contract symbol', 'IOTSFT')
    .option('-d, --decimals <decimals>', 'Decimal places', '18')
    .action(async (options) => {
        try {
            console.log('🚀 Starting IoTSFT contract deployment...');
            
            const [deployer] = await ethers.getSigners();
            console.log(`👤 Deploying account: ${deployer.address}`);
            
            const IoTSFTFactory = await ethers.getContractFactory("IoTSFT");
            const iotSFT = await IoTSFTFactory.deploy(
                options.name,
                options.symbol,
                parseInt(options.decimals)
            );
            
            await iotSFT.waitForDeployment();
            const contractAddress = await iotSFT.getAddress();
            
            console.log('✅ Contract deployed successfully!');
            console.log(`📍 Contract address: ${contractAddress}`);
            console.log(`💡 Please update .env file: CONTRACT_ADDRESS_SEPOLIA=${contractAddress}`);
            
        } catch (error) {
            console.error('❌ Deployment failed:', error);
            process.exit(1);
        }
    });

// Mint command
program
    .command('mint')
    .description('Mint IoT Token')
    .option('-t, --type <type>', 'DeviceType (0=Temperature sensor, 1=Crowd density sensor)', '0')
    .option('-v, --value <value>', 'Token value', '100')
    .option('-r, --recipient <address>', 'Recipient address')
    .action(async (options) => {
        try {
            const { contract, signer } = await getContract();
            
            const recipient = options.recipient || signer.address;
            const deviceType = parseInt(options.type);
            const value = parseInt(options.value);
            
            console.log('🚀 Start minting IoT Token...');
            console.log(`👤 Recipient address: ${recipient}`);
            console.log(`🔧 Device type: ${deviceType} (${deviceType === 0 ? 'Temperature sensor' : 'Crowd density sensor'})`);
            console.log(`💰 Token value: ${value}`);
            
            const tx = await contract.mint(recipient, deviceType, value);
            console.log(`📝 Transaction submitted: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log('✅ Minting successful!');
            console.log(`⛽ Gas used: ${receipt!.gasUsed.toString()}`);
            
        } catch (error) {
            console.error('❌ Minting failed:', error);
            process.exit(1);
        }
    });

// Split command
program
    .command('split')
    .description('Split IoT Token')
    .requiredOption('-i, --tokenId <tokenId>', 'Token ID to split')
    .requiredOption('-a, --amount <amount>', 'Split amount')
    .requiredOption('-r, --recipient <address>', 'Address to receive new token')
    .action(async (options) => {
        try {
            const { contract } = await getContract();
            
            const tokenId = parseInt(options.tokenId);
            const amount = parseInt(options.amount);
            const recipient = options.recipient;
            
            // Check token information
            const balance = await contract["balanceOf(uint256)"](tokenId);
            const slot = await contract.slotOf(tokenId);
            const owner = await contract.ownerOf(tokenId);
            
            console.log('✂️ Start splitting IoT Token...');
            formatTokenInfo(tokenId, balance, slot, owner);
            console.log(`📤 Split amount: ${amount}`);
            console.log(`👤 Recipient address: ${recipient}`);
            
            if (balance < amount) {
                console.error(`❌ Insufficient balance: Current balance ${balance.toString()}, Required ${amount}`);
                process.exit(1);
            }
            
            const tx = await contract.splitValue(tokenId, amount, recipient);
            console.log(`📝 Transaction submitted: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log('✅ Split successful!');
            console.log(`⛽ Gas used: ${receipt!.gasUsed.toString()}`);
            
            // Show post-split status
            const newBalance = await contract["balanceOf(uint256)"](tokenId);
            console.log(`📊 Token balance after split: ${newBalance.toString()}`);
            
        } catch (error) {
            console.error('❌ Split Failed:', error);
            process.exit(1);
        }
    });

// Merge command
program
    .command('merge')
    .description('Merge IoT Token value')
    .requiredOption('-f, --from <fromTokenId>', 'Source token ID')
    .requiredOption('-t, --to <toTokenId>', 'Target token ID')
    .requiredOption('-a, --amount <amount>', 'Transfer amount')
    .action(async (options) => {
        try {
            const { contract } = await getContract();
            
            const fromTokenId = parseInt(options.from);
            const toTokenId = parseInt(options.to);
            const amount = parseInt(options.amount);
            
            // Check Token Information
            const fromBalance = await contract["balanceOf(uint256)"](fromTokenId);
            const toBalance = await contract["balanceOf(uint256)"](toTokenId);
            const fromSlot = await contract.slotOf(fromTokenId);
            const toSlot = await contract.slotOf(toTokenId);
            
            console.log('🔄 Start Merge IoTToken Value...');
            console.log('📤 Original Token:');
            formatTokenInfo(fromTokenId, fromBalance, fromSlot, await contract.ownerOf(fromTokenId));
            console.log('📥 Target Token:');
            formatTokenInfo(toTokenId, toBalance, toSlot, await contract.ownerOf(toTokenId));
            console.log(`💰 Transfer amount: ${amount}`);
            
            if (fromSlot !== toSlot) {
                console.error(`❌ TokenSlot Not Match: Original TokenSlot ${fromSlot.toString()}, Target TokenSlot ${toSlot.toString()}`);
                process.exit(1);
            }
            
            if (fromBalance < amount) {
                console.error(`❌ Original Token Balance Not Enough: Current Balance ${fromBalance.toString()}, Required ${amount}`);
                process.exit(1);
            }
            
            const tx = await contract.mergeValue(fromTokenId, toTokenId, amount);
            console.log(`📝 Transaction submitted: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log('✅ Merge successful!');
            console.log(`⛽ Gas used: ${receipt!.gasUsed.toString()}`);
            
            // Indicate Merge Status
            const newFromBalance = await contract["balanceOf(uint256)"](fromTokenId);
            const newToBalance = await contract["balanceOf(uint256)"](toTokenId);
            console.log(`📊 Merged Original TokenBalance: ${newFromBalance.toString()}`);
            console.log(`📊 Merged Target TokenBalance: ${newToBalance.toString()}`);

        } catch (error) {
            console.error('❌ Merge Failed:', error);
            process.exit(1);
        }
    });

// Query command
program
    .command('info')
    .description('Check Token or Contract Information')
    .option('-i, --tokenId <tokenId>', 'TokenID')
    .option('-c, --contract', 'Show Contract Information')
    .action(async (options) => {
        try {
            const { contract, contractAddress } = await getContract();
            
            if (options.contract) {
                // Show Contract Information
                console.log('📋 Contract Information:');
                console.log(`📍 Address: ${contractAddress}`);
                console.log(`📝 Name: ${await contract.name()}`);
                console.log(`🔤 Symbol: ${await contract.symbol()}`);
                console.log(`🔢 Decimals: ${await contract.valueDecimals()}`);
                console.log(`👤 Owner: ${await contract.owner()}`);
                
            } else if (options.tokenId) {
                // Show Token Information
                const tokenId = parseInt(options.tokenId);
                
                try {
                    const balance = await contract["balanceOf(uint256)"](tokenId);
                    const slot = await contract.slotOf(tokenId);
                    const owner = await contract.ownerOf(tokenId);
                    
                    formatTokenInfo(tokenId, balance, slot, owner);
                    
                } catch (error) {
                    console.error(`❌ Token #${tokenId} Not Found or Query Failed`);
                    process.exit(1);
                }
                
            } else {
                console.error('❌ Please Specify --tokenId or --contract Parameter');
                process.exit(1);
            }
            
        } catch (error) {
            console.error('❌ Query Failed:', error);
            process.exit(1);
        }
    });

// Batch Operation
program
    .command('batch-mint')
    .description('Match Mint Token')
    .requiredOption('-c, --count <count>', 'Minting Count')
    .option('-t, --type <type>', 'DeviceType', '0')
    .option('-v, --value <value>', 'Every Token Value', '100')
    .option('-r, --recipient <address>', 'Recipient Address')
    .action(async (options) => {
        try {
            const { contract, signer } = await getContract();
            
            const count = parseInt(options.count);
            const deviceType = parseInt(options.type);
            const value = parseInt(options.value);
            const recipient = options.recipient || signer.address;
            
            console.log(`🏭 Start Minting ${count} Tokens...`);
            console.log(`👤 Recipient address: ${recipient}`);
            console.log(`🔧 Device type: ${deviceType}`);
            console.log(`💰 Every Token Value: ${value}`);
            
            let totalGas = BigInt(0);
            const startTime = Date.now();
            
            for (let i = 0; i < count; i++) {
                const tx = await contract.mint(recipient, deviceType, value);
                const receipt = await tx.wait();
                totalGas += receipt!.gasUsed;
                
                if ((i + 1) % 10 === 0 || i === count - 1) {
                    console.log(` Minted  ${i + 1}/${count} Tokens`);
                }
            }
            
            const endTime = Date.now();

            console.log('✅ Batch Minting Complete!');
            console.log(`⏱️ Total Time: ${endTime - startTime}ms`);
            console.log(`⛽ Total Gas Consumption: ${totalGas.toString()}`);
            console.log(`📊 Average per Token: ${(Number(totalGas) / count).toFixed(0)} Gas`);

        } catch (error) {
            console.error('❌ Batch Minting Failed:', error);
            process.exit(1);
        }
    });

// PerformanceTest 
program
    .command('benchmark')
    .description('Run Performance Benchmark Test')
    .option('-o, --operations <operations>', 'Test Operation Count', '10')
    .action(async (options) => {
        try {
            const { contract, signer } = await getContract();
            const operations = parseInt(options.operations);

            console.log(`🔬 Start Performance Benchmark Test (${operations} Operations)...`);

            // Prepare Test Data
            console.log('📋 Preparing Test Environment...');
            await contract.mint(signer.address, 0, 10000);
            await contract.mint(signer.address, 1, 10000);
            
            const results: {
                mint: { times: number[], gas: number[] },
                split: { times: number[], gas: number[] },
                merge: { times: number[], gas: number[] }
            } = {
                mint: { times: [], gas: [] },
                split: { times: [], gas: [] },
                merge: { times: [], gas: [] }
            };

            // Test Minting Performance
            console.log('🧪 Test Minting Performance...');
            for (let i = 0; i < operations; i++) {
                const start = Date.now();
                const tx = await contract.mint(signer.address, i % 2, 100);
                const receipt = await tx.wait();
                const end = Date.now();
                
                results.mint.times.push(end - start);
                results.mint.gas.push(Number(receipt!.gasUsed));
            }

            // Test Splitting Performance
            console.log('🧪 Test Splitting Performance...');
            for (let i = 0; i < Math.min(operations, 10); i++) {
                const start = Date.now();
                const tx = await contract.splitValue(1, 100, signer.address);
                const receipt = await tx.wait();
                const end = Date.now();
                
                results.split.times.push(end - start);
                results.split.gas.push(Number(receipt!.gasUsed));
            }

            // Generate Report
            console.log('📊 Performance Benchmark Test Report:');
            console.log('═══════════════════════════════════════');
            
            Object.entries(results).forEach(([operation, data]) => {
                if (data.times.length > 0) {
                    const avgTime = data.times.reduce((a, b) => a + b, 0) / data.times.length;
                    const avgGas = data.gas.reduce((a, b) => a + b, 0) / data.gas.length;
                    const minTime = Math.min(...data.times);
                    const maxTime = Math.max(...data.times);
                    
                    console.log(`${operation.toUpperCase()} Operation:`);
                    console.log(`  Average time: ${avgTime.toFixed(1)}ms`);
                    console.log(`  Time range: ${minTime}ms - ${maxTime}ms`);
                    console.log(`  Average gas: ${avgGas.toFixed(0)}`);
                    console.log(`  Operations count: ${data.times.length}`);
                    console.log('');
                }
            });
            
        } catch (error) {
            console.error('❌ Benchmark test failed:', error);
            process.exit(1);
        }
    });

// PerformanceAnalysis与ReportGenerate
program
    .command('performance-analysis')
    .description('运行完整的PerformanceAnalysis并Generate可视化Report')
    .option('-s, --scaling', '运行scalingPerformanceTest')
    .option('-c, --concurrency', '运行并发PerformanceTest')
    .option('-a, --all', '运行所有PerformanceTest')
    .option('--max-scale <number>', '最大scaling规模', '1000')
    .option('--concurrent-ops <number>', '并发Operation数量', '10')
    .option('--output-dir <path>', 'Report output directory', './performance-reports')
    .action(async (options) => {
        try {
            console.log('🚀 启动PerformanceAnalysis系统...');
            console.log('═══════════════════════════════════════');
            
            // 部署合约用于Test
            console.log('📦 Deploying test contract...');
            const [deployer] = await ethers.getSigners();
            const IoTSFTFactory = await ethers.getContractFactory("IoTSFT");
            const contract = await IoTSFTFactory.deploy(
                "IoT SFT Performance Test",
                "IOTP",
                18
            );
            await contract.waitForDeployment();
            console.log('✅ Contract deployment complete');
            
            // 动态导入PerformanceAnalysis器
            const { PerformanceAnalyzer } = await import('./performance-analyzer');
            const { ChartGenerator } = await import('./chart-generator');
            const { PngChartGenerator } = await import('./png-chart-generator');
            const { ReportGenerator } = await import('./report-generator');
            
            // InitializeAnalysis器
            const analyzer = new PerformanceAnalyzer(contract, deployer);
            const chartGen = new ChartGenerator();
            const pngChartGen = new PngChartGenerator();
            const reportGen = new ReportGenerator();
            
            console.log('📋 Configuration参数:');
            console.log(`  最大Scaling规模: ${options.maxScale}`);
            console.log(`  并发Operation数: ${options.concurrentOps}`);
            console.log(`  Report output directory: ${options.outputDir}`);
            console.log('');
            
            // 运行PerformanceTest
            let results: any = {};
            
            if (options.scaling || options.all) {
                console.log('🔍 执行ScalingPerformanceTest...');
                const scalingResults = await analyzer.runScalingTest([
                    10, 50, 100, 250, 500, parseInt(options.maxScale)
                ]);
                results.scaling = scalingResults;
                console.log('✅ ScalingTestComplete');
            }
            
            if (options.concurrency || options.all) {
                console.log('⚡ 执行并发PerformanceTest...');
                const concurrencyResults = await analyzer.runConcurrencyTest(
                    parseInt(options.concurrentOps)
                );
                results.concurrency = concurrencyResults;
                console.log('✅ 并发TestComplete');
            }
            
            if (!options.scaling && !options.concurrency && !options.all) {
                console.log('⚠️  未指定TestType，默认运行所有Test');
                console.log('🔍 执行ScalingPerformanceTest...');
                const scalingResults = await analyzer.runScalingTest([
                    10, 50, 100, 250, 500, parseInt(options.maxScale)
                ]);
                results.scaling = scalingResults;
                console.log('✅ ScalingTestComplete');
                
                console.log('⚡ 执行并发PerformanceTest...');
                const concurrencyResults = await analyzer.runConcurrencyTest(
                    parseInt(options.concurrentOps)
                );
                results.concurrency = concurrencyResults;
                console.log('✅ 并发TestComplete');
            }
            
            // Generate图表
            console.log('📊 GeneratePerformance图表...');
            if (results.scaling) {
                await chartGen.generateAllCharts(results.scaling);
                await pngChartGen.generateAllPngCharts(results.scaling);
            }
            console.log('✅ 图表GenerateComplete');
            
            // GenerateHTML report
            console.log('📄 GenerateHTML report...');
            await reportGen.generateCompleteReport(results.scaling || results.concurrency, []);
            console.log('✅ ReportGenerateComplete');
            
            console.log('');
            console.log('🎉 PerformanceAnalysisComplete！');
            console.log('═══════════════════════════════════════');
            console.log(`📂 Report位置: ${options.outputDir}`);
            console.log(`🌐 打开Report: ${options.outputDir}/performance-report.html`);
            console.log('');
            
        } catch (error) {
            console.error('❌ PerformanceAnalysis失败:', error);
            process.exit(1);
        }
    });

// 快速Performance检查
program
    .command('quick-perf')
    .description('快速Performance检查 (轻量级Test)')
    .option('--operations <number>', 'TestOperation数量', '100')
    .action(async (options) => {
        try {
            console.log('⚡ 启动快速Performance检查...');
            
            // Deploying test contract
            const [deployer] = await ethers.getSigners();
            const IoTSFTFactory = await ethers.getContractFactory("IoTSFT");
            const contract = await IoTSFTFactory.deploy(
                "Quick Test SFT",
                "QSFT",
                18
            );
            await contract.waitForDeployment();
            
            const { PerformanceAnalyzer } = await import('./performance-analyzer');
            const analyzer = new PerformanceAnalyzer(contract, deployer);
            
            // 运行轻量级Test
            const results = await analyzer.runQuickTest(parseInt(options.operations));
            
            console.log('');
            console.log('📊 快速Performance检查Result:');
            console.log('═══════════════════════════════════════');
            console.log(`总Operation数: ${results.totalOperations}`);
            console.log(`总用时: ${results.totalTime}ms`);
            console.log(`平均Gas Consumption: ${results.averageGas.toFixed(0)}`);
            console.log(`TPS (每秒交易): ${results.tps.toFixed(2)}`);
            console.log('');
            
            if (results.tps < 10) {
                console.log('⚠️  Performance警告: TPS较低，建议运行完整PerformanceAnalysis');
            } else if (results.tps > 50) {
                console.log('✅ Performance良好: TPS表现优秀');
            } else {
                console.log('ℹ️  Performance normal: TPS within reasonable range');
            }
            
        } catch (error) {
            console.error('❌ 快速Performance检查失败:', error);
            process.exit(1);
        }
    });

// Device可ScalabilityAnalysis
program
    .command('device-scalability')
    .description('AnalysisNumber of Device Types对合约Performance的影响')
    .option('-r, --ranges <ranges>', 'Device type count range (例如: "10,50,100,500")', '10,50,100,500')
    .option('--output-dir <path>', 'Report output directory', './performance-reports/device-scalability')
    .action(async (options) => {
        try {
            console.log('🔬 启动Device可ScalabilityAnalysis...');
            console.log('═══════════════════════════════════════');
            console.log('ℹ️  注意: 当前合约只支持2种预定义DeviceType，Test将在此限制下进行');
            
            // Deploying test contract
            console.log('📦 Deploying test contract...');
            const [deployer] = await ethers.getSigners();
            const IoTSFTFactory = await ethers.getContractFactory("IoTSFT");
            const contract = await IoTSFTFactory.deploy(
                "Device Analysis Test",
                "DAT",
                18
            );
            await contract.waitForDeployment();
            console.log('✅ Contract deployment complete');
            
            // 运行简化的DevicePerformanceAnalysis
            const { SimpleDeviceAnalyzer } = await import('./simple-device-analyzer');
            const analyzer = new SimpleDeviceAnalyzer(contract, deployer);
            
            await analyzer.analyzeCurrentDevicePerformance();
            
            console.log('');
            console.log('🎉 DevicePerformanceAnalysisComplete！');
            console.log('📂 查看详细Report: ./performance-reports/device-analysis/');
            console.log('💡 建议: 考虑扩展合约以支持更多DeviceType以进行完整的可ScalabilityTest');
            
        } catch (error) {
            console.error('❌ Device可ScalabilityAnalysis失败:', error);
            process.exit(1);
        }
    });

// MergeImprovementAnalysis
program
    .command('merge-improvements')
    .description('AnalysisMergeOperation的Improvement方案效果')
    .action(async () => {
        try {
            console.log('🔬 启动MergeImprovement方案Analysis...');
            console.log('═══════════════════════════════════════');
            
            // 部署Improvement版合约
            console.log('📦 部署Improvement版Test合约...');
            const [deployer] = await ethers.getSigners();
            const IoTSFTFactory = await ethers.getContractFactory("IoTSFT");
            const contract = await IoTSFTFactory.deploy(
                "Improved IoT SFT",
                "IIOT",
                18
            );
            await contract.waitForDeployment();
            console.log('✅ Improvement版Contract deployment complete');
            
            // 运行ImprovementAnalysis
            const { MergeImprovementAnalyzer } = await import('./merge-improvement-analyzer');
            const analyzer = new MergeImprovementAnalyzer(contract, deployer);
            
            await analyzer.analyzeMergeImprovements();
            
            console.log('');
            console.log('🎉 MergeImprovementAnalysisComplete！');
            console.log('📂 查看详细Report: ./performance-reports/merge-improvements/');
            
        } catch (error) {
            console.error('❌ MergeImprovementAnalysis失败:', error);
            process.exit(1);
        }
    });

// Multi-dimensionalDeviceScalabilityTest
program
    .command('multi-dimensional')
    .description('Run multi-dimensional device scalability test (device types × token count)')
    .option('--device-types <numbers>', 'Device type count range', '2,4,6,8,10,12')
    .option('--tokens-per-type <numbers>', 'Tokens per type range', '50,100,200')
    .option('--repetitions <number>', 'Repetitions per configuration', '3')
    .option('--output-dir <path>', 'Report output directory', './performance-reports/multi-dimensional')
    .action(async (options) => {
        try {
            console.log('🚀 Starting multi-dimensional device scalability test...');
            console.log('═══════════════════════════════════════');
            
            // 部署合约用于Test
            console.log('📦 Deploying test contract...');
            const [deployer] = await ethers.getSigners();
            const IoTSFTFactory = await ethers.getContractFactory("IoTSFT");
            const contract = await IoTSFTFactory.deploy(
                "IoT SFT Multi-Dimensional Test",
                "IOTMD",
                18
            );
            await contract.waitForDeployment();
            console.log('✅ Contract deployment complete');
            
            // 导入Multi-dimensionalAnalysis器
            const { MultiDimensionalAnalyzer } = await import('./multi-dimensional-analyzer');
            
            // InitializeAnalysis器
            const analyzer = new MultiDimensionalAnalyzer(contract as any, deployer);
            
            console.log('📋 Test configuration:');
            console.log(`  Device type count: ${options.deviceTypes}`);
            console.log(`  Tokens per type: ${options.tokensPerType}`);
            console.log(`  Repetitions: ${options.repetitions}`);
            console.log(`  Output directory: ${options.outputDir}`);
            console.log('');
            
            // 运行Multi-dimensionalTest
            const summaries = await analyzer.runFullMultiDimensionalTest();
            
            console.log('\n📊 Multi-dimensional Test Results Overview:');
            console.log('═══════════════════════════════════════');
            
            for (const summary of summaries) {
                console.log(`🔸 ${summary.deviceTypeCount} device types × ${summary.tokensPerType} tokens/type:`);
                console.log(`   📊 Slot efficiency: ${(summary.avgSlotEfficiency * 100).toFixed(1)}%`);
                console.log(`   ⛽ Average mint gas: ${summary.avgMintGas.toFixed(0)}`);
                console.log(`   🔄 Merge success rate: ${summary.avgMergeSuccessRate.toFixed(1)}%`);
                console.log(`   💡 Insights: ${summary.insights.join(', ')}`);
                console.log('');
            }
            
            console.log('🎉 Multi-dimensional device scalability test completed!');
            console.log(`📂 View detailed report: ${options.outputDir}/`);
            
        } catch (error) {
            console.error('❌ Multi-dimensionalTest失败:', error);
            process.exit(1);
        }
    });

// OperationPerformanceTest命令
program
    .command('perf:operations')
    .description('运行三种Operation(Mint/Split/Merge)的Performance对比Test')
    .option('-m, --min-types <number>', '最小Number of Device Types', '2')
    .option('-M, --max-types <number>', '最大Number of Device Types', '12')
    .option('-s, --step <number>', 'Number of Device Types步长', '2')
    .option('-t, --tokens-per-type <number>', 'Tokens per type', '100')
    .option('-r, --repetitions <number>', 'Repetitions', '3')
    .option('-o, --output-dir <dir>', '输出目录', './performance-reports/operations')
    .action(async (options) => {
        try {
            console.log('🚀 启动OperationPerformance对比Test...');
            console.log('═══════════════════════════════════════');
            console.log('📋 Test重点: Mint/Split/Merge三种Operation随Number of Device Types变化的Performance表现');
            console.log(`🔢 Device type range: ${options.minTypes} → ${options.maxTypes} (步长: ${options.step})`);
            console.log(`📊 Tokens per type: ${options.tokensPerType}`);
            console.log(`🔄 Repetitions: ${options.repetitions}`);
            console.log(`📂 输出目录: ${options.outputDir}`);
            console.log('');
            
            const { contract, signer } = await getContract();
            const { MultiDimensionalAnalyzer } = await import('./multi-dimensional-analyzer');
            
            // 创建Analysis器
            const analyzer = new MultiDimensionalAnalyzer(contract as any, signer);
            
            // 设置Test configuration - 专注于OperationPerformance对比
            const minTypes = parseInt(options.minTypes);
            const maxTypes = parseInt(options.maxTypes);
            const step = parseInt(options.step);
            const tokensPerType = parseInt(options.tokensPerType);
            const repetitions = parseInt(options.repetitions);
            
            const deviceTypeCounts = [];
            for (let i = minTypes; i <= maxTypes; i += step) {
                deviceTypeCounts.push(i);
            }
            
            console.log(`🎯 将Test ${deviceTypeCounts.length} 种Device Configuration: [${deviceTypeCounts.join(', ')}]`);
            console.log(`📈 重点关注指标: Gas Consumption、Response Time、Throughput(TPS)`);
            console.log('');
            
            // 运行针对OperationPerformance的Multi-dimensionalTest
            const allResults = [];
            let testIndex = 0;
            const totalTests = deviceTypeCounts.length * repetitions;

            for (const deviceTypeCount of deviceTypeCounts) {
                console.log(`\n🔸 Test configuration: ${deviceTypeCount} device types × ${tokensPerType}Token/类`);
                console.log('─'.repeat(50));
                
                for (let rep = 0; rep < repetitions; rep++) {
                    testIndex++;
                    console.log(`\n🔄 第 ${rep + 1}/${repetitions} 次Repeat (Overall progress: ${testIndex}/${totalTests})`);
                    
                    const result = await analyzer.runSingleTest(deviceTypeCount, tokensPerType, rep);
                    allResults.push(result);
                    
                    // 显示关键OperationPerformance指标
                    console.log(`✅ TestComplete:`);
                    console.log(`   ⛽ Mint Gas: ${result.avgMintGas.toFixed(0)}, 时间: ${result.avgMintTime.toFixed(2)}ms, TPS: ${result.mintTPS.toFixed(2)}`);
                    if (result.avgSplitGas > 0) {
                        console.log(`   ✂️ Split Gas: ${result.avgSplitGas.toFixed(0)}, 时间: ${result.avgSplitTime.toFixed(2)}ms, TPS: ${result.splitTPS.toFixed(2)}`);
                    }
                    console.log(`   🔄 Merge Success Rate: ${result.mergeSuccessRate.toFixed(1)}%, TPS: ${result.mergeTPS.toFixed(2)}`);
                }
            }
            
            // 聚合和保存Result
            const summaries = analyzer.aggregateResults(allResults);
            await analyzer.saveResults(allResults, summaries);
            
            console.log('\n📊 Operation Performance Comparison Test Results Overview:');
            console.log('═══════════════════════════════════════');
            
            // 显示三种Operation的Performance趋势
            for (const summary of summaries) {
                console.log(`🔸 ${summary.deviceTypeCount}种Device type:`);
                console.log(`   🔨 MintOperation  - Gas: ${summary.avgMintGas.toFixed(0)}, 时间: ${summary.avgMintTime.toFixed(2)}ms, TPS: ${summary.avgMintTPS.toFixed(2)}`);
                if (summary.avgSplitGas > 0) {
                    console.log(`   ✂️ Split operation - Gas: ${summary.avgSplitGas.toFixed(0)}, Time: ${summary.avgSplitTime.toFixed(2)}ms, TPS: ${summary.avgSplitTPS.toFixed(2)}`);
                }
                console.log(`   🔄 Merge operation - Success Rate: ${summary.avgMergeSuccessRate.toFixed(1)}%, TPS: ${summary.avgMergeTPS.toFixed(2)}`);
                console.log(`   📊 Slot efficiency: ${(summary.avgSlotEfficiency * 100).toFixed(1)}%`);
                console.log('');
            }
            
            console.log('🎉 Operation performance comparison test completed!');
            console.log('📈 View generated charts to analyze performance trends of three operations');
            console.log(`📂 Detailed report: ${options.outputDir}/`);
            
        } catch (error) {
            console.error('❌ OperationPerformanceTest失败:', error);
            process.exit(1);
        }
    });

// 解析命令行参数并执行
program.parse();
