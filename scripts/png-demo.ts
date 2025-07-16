#!/usr/bin/env node

import { Command } from 'commander';
import { ethers } from 'hardhat';
import { MultiDimensionalAnalyzer } from './multi-dimensional-analyzer';
import { ChartGenerator, ChartGeneratorOptions } from './chart-generator';

const program = new Command();

program
    .name('png-demo')
    .description('Demo PNG chart generation functionality')
    .version('1.0.0');

program
    .command('multi-dimensional')
    .description('Run multi-dimensional test with PNG generation')
    .option('--png', 'Generate PNG images of charts')
    .option('--width <number>', 'PNG width in pixels', '1000')
    .option('--height <number>', 'PNG height in pixels', '800')
    .action(async (options) => {
        console.log('🚀 Starting multi-dimensional analysis with PNG generation demo...');
        
        try {
            // Deploy contract
            const IoTSFT = await ethers.getContractFactory("IoTSFT");
            const contract = await IoTSFT.deploy("IoT SFT Demo", "IOTDEMO", 18);
            await contract.waitForDeployment();
            
            const [signer] = await ethers.getSigners();
            
            // Create analyzer with PNG options
            const analyzerOptions = {
                generatePNG: options.png || false,
                pngWidth: parseInt(options.width),
                pngHeight: parseInt(options.height)
            };
            
            const analyzer = new MultiDimensionalAnalyzer(contract as any, signer, analyzerOptions);
            
            console.log(`📊 PNG generation: ${analyzerOptions.generatePNG ? 'ENABLED' : 'DISABLED'}`);
            if (analyzerOptions.generatePNG) {
                console.log(`🖼️ PNG dimensions: ${analyzerOptions.pngWidth}x${analyzerOptions.pngHeight}`);
            }
            
            // Run a quick test with smaller parameters
            console.log('🔧 Running quick multi-dimensional test...');
            const deviceTypeCounts = [2, 4, 6]; // Smaller test
            const tokensPerTypeOptions = [20, 50]; // Smaller amounts
            const repetitions = 2; // Fewer repetitions
            
            const results = [];
            let testIndex = 0;
            const totalTests = deviceTypeCounts.length * tokensPerTypeOptions.length * repetitions;
            
            for (const deviceTypeCount of deviceTypeCounts) {
                for (const tokensPerType of tokensPerTypeOptions) {
                    for (let rep = 0; rep < repetitions; rep++) {
                        testIndex++;
                        console.log(`\\n📋 Test ${testIndex}/${totalTests}: ${deviceTypeCount} device types, ${tokensPerType} tokens/type (rep ${rep + 1})`);
                        
                        const result = await analyzer.runSingleTest(deviceTypeCount, tokensPerType, rep);
                        results.push(result);
                    }
                }
            }
            
            // Aggregate results and generate report
            const summaries = analyzer.aggregateResults(results);
            await analyzer.saveResults(results, summaries);
            
            console.log('\\n🎉 Multi-dimensional PNG demo completed!');
            
            if (analyzerOptions.generatePNG) {
                console.log('\\n🖼️ PNG images have been generated in the performance-reports/multi-dimensional/png/ directory');
                console.log('📄 HTML report includes links to view PNG versions of charts');
            }
            
        } catch (error) {
            console.error('❌ Demo failed:', error);
            process.exit(1);
        }
    });

program
    .command('chart-generator')
    .description('Demo ChartGenerator PNG functionality with mock data')
    .option('--png', 'Generate PNG images of charts')
    .option('--width <number>', 'PNG width in pixels', '1000')
    .option('--height <number>', 'PNG height in pixels', '800')
    .action(async (options) => {
        console.log('🚀 Starting ChartGenerator PNG demo...');
        
        try {
            const chartOptions: ChartGeneratorOptions = {
                generatePNG: options.png || false,
                pngWidth: parseInt(options.width),
                pngHeight: parseInt(options.height)
            };
            
            const generator = new ChartGenerator(chartOptions);
            
            console.log(`📊 PNG generation: ${chartOptions.generatePNG ? 'ENABLED' : 'DISABLED'}`);
            if (chartOptions.generatePNG) {
                console.log(`🖼️ PNG dimensions: ${chartOptions.pngWidth}x${chartOptions.pngHeight}`);
            }
            
            // Create mock performance data in correct format
            const mockResults = {
                testName: 'PNG Demo Test',
                timestamp: new Date().toISOString(),
                environment: 'hardhat-localhost',
                summary: {
                    totalOperations: 600,
                    totalTime: 45000,
                    totalGas: BigInt(25000000),
                    avgThroughput: 35
                },
                metrics: [
                    {
                        operation: 'mint',
                        scale: 100,
                        times: [300, 320, 280, 310, 290],
                        gas: [80000, 82000, 78000, 81000, 79000],
                        timestamps: [Date.now(), Date.now() + 1000, Date.now() + 2000, Date.now() + 3000, Date.now() + 4000],
                        avgTime: 300,
                        avgGas: 80000,
                        minTime: 280,
                        maxTime: 320,
                        throughput: 20,
                        actualThroughput: 18,
                        operationCount: 5
                    },
                    {
                        operation: 'split',
                        scale: 100,
                        times: [400, 420, 380, 410, 390],
                        gas: [120000, 125000, 115000, 122000, 118000],
                        timestamps: [Date.now(), Date.now() + 1000, Date.now() + 2000, Date.now() + 3000, Date.now() + 4000],
                        avgTime: 400,
                        avgGas: 120000,
                        minTime: 380,
                        maxTime: 420,
                        throughput: 15,
                        actualThroughput: 12,
                        operationCount: 5
                    },
                    {
                        operation: 'merge',
                        scale: 500,
                        times: [350, 380, 330, 360, 340],
                        gas: [100000, 105000, 95000, 102000, 98000],
                        timestamps: [Date.now(), Date.now() + 1000, Date.now() + 2000, Date.now() + 3000, Date.now() + 4000],
                        avgTime: 350,
                        avgGas: 100000,
                        minTime: 330,
                        maxTime: 380,
                        throughput: 17,
                        actualThroughput: 14,
                        operationCount: 5
                    }
                ]
            };
            
            // Generate charts with PNG option
            const reportResult = await generator.generateCompleteReport(mockResults, 'PNG Demo Report');
            
            console.log('\\n✅ ChartGenerator PNG demo completed!');
            console.log(`📄 HTML report: ${reportResult.htmlPath}`);
            
            if (chartOptions.generatePNG && reportResult.pngFiles) {
                console.log('\\n🖼️ Generated PNG files:');
                reportResult.pngFiles.forEach(file => {
                    console.log(`   📸 ${file}`);
                });
                console.log('\\n📄 HTML report includes links to view PNG versions of charts');
            }
            
        } catch (error) {
            console.error('❌ ChartGenerator demo failed:', error);
            process.exit(1);
        }
    });

// Parse command line arguments
program.parse();
