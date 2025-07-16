import fs from "fs-extra";
import path from "path";
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import type { ScalingTestResults, PerformanceMetrics } from "./performance-analyzer";

export interface ChartConfig {
    title: string;
    type: 'line' | 'bar' | 'scatter' | 'area';
    data: {
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            borderColor?: string;
            backgroundColor?: string;
            fill?: boolean;
        }[];
    };
    options: any;
}

export interface ChartGeneratorOptions {
    generatePNG?: boolean;
    pngWidth?: number;
    pngHeight?: number;
}

export class ChartGenerator {
    private outputDir: string;
    private chartJSNodeCanvas: ChartJSNodeCanvas;
    private options: ChartGeneratorOptions;

    constructor(options: ChartGeneratorOptions = {}) {
        this.outputDir = path.join(process.cwd(), 'performance-reports');
        this.options = {
            generatePNG: false,
            pngWidth: 800,
            pngHeight: 600,
            ...options
        };
        
        // Initialize ChartJSNodeCanvas for PNG generation
        this.chartJSNodeCanvas = new ChartJSNodeCanvas({
            width: this.options.pngWidth!,
            height: this.options.pngHeight!,
            backgroundColour: 'white'
        });
    }

    /**
     * Generate all charts from test results
     */
    async generateAllCharts(results: ScalingTestResults): Promise<string[]> {
        console.log('📊 Starting performance chart generation...');
        
        const chartFiles: string[] = [];
        
        // 1. Gas consumption scaling trend chart
        const gasChart = this.createGasScalingChart(results);
        const gasFile = await this.saveChart(gasChart, 'gas-scaling-trend');
        chartFiles.push(gasFile);
        
        // 2. Response time scaling chart
        const timeChart = this.createTimeScalingChart(results);
        const timeFile = await this.saveChart(timeChart, 'time-scaling-trend');
        chartFiles.push(timeFile);
        
        // 3. Throughput performance curve
        const throughputChart = this.createThroughputChart(results);
        const throughputFile = await this.saveChart(throughputChart, 'throughput-curve');
        chartFiles.push(throughputFile);
        
        // 4. Operation type comparison chart
        const operationChart = this.createOperationComparisonChart(results);
        const operationFile = await this.saveChart(operationChart, 'operation-comparison');
        chartFiles.push(operationFile);
        
        // 5. Gas efficiency analysis chart
        const efficiencyChart = this.createGasEfficiencyChart(results);
        const efficiencyFile = await this.saveChart(efficiencyChart, 'gas-efficiency');
        chartFiles.push(efficiencyFile);

        console.log(`✅ Generated ${chartFiles.length} chart configuration files`);
        
        // Generate PNG images if option is enabled
        if (this.options.generatePNG) {
            console.log('🖼️ Converting charts to PNG images...');
            const pngFiles = await this.generatePNGImages([
                gasChart, timeChart, throughputChart, operationChart, efficiencyChart
            ], [
                'gas-scaling-trend', 'time-scaling-trend', 'throughput-curve', 
                'operation-comparison', 'gas-efficiency'
            ]);
            chartFiles.push(...pngFiles);
        }
        
        return chartFiles;
    }

    /**
     * Create gas consumption scaling trend chart
     */
    private createGasScalingChart(results: ScalingTestResults): ChartConfig {
        const mintData: number[] = [];
        const splitData: number[] = [];
        const mergeData: number[] = [];
        const transferData: number[] = [];
        const packageData: number[] = [];
        const optimizeData: number[] = [];
        const scales: string[] = [];

        // Group data by scale and sort strictly
        const scaleGroups = this.groupMetricsByScale(results.metrics);
        const sortedScales = Object.keys(scaleGroups)
            .map(scale => parseInt(scale))
            .sort((a, b) => a - b)
            .map(scale => scale.toString());
        
        sortedScales.forEach(scale => {
            scales.push(scale);
            const metrics = scaleGroups[scale];
            
            mintData.push(metrics.find(m => m.operation === 'mint')?.avgGas || 0);
            splitData.push(metrics.find(m => m.operation === 'split')?.avgGas || 0);
            mergeData.push(metrics.find(m => m.operation === 'merge')?.avgGas || 0);
            transferData.push(metrics.find(m => m.operation === 'transfer')?.avgGas || 0);
            packageData.push(metrics.find(m => m.operation === 'package')?.avgGas || 0);
            optimizeData.push(metrics.find(m => m.operation === 'optimize')?.avgGas || 0);
        });

        return {
            title: 'Gas Consumption Scaling Trend',
            type: 'line',
            data: {
                labels: scales.map(s => `${s} Operations`),
                datasets: [
                    {
                        label: 'Mint',
                        data: mintData,
                        borderColor: '#FF6384',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        fill: false
                    },
                    {
                        label: 'Split',
                        data: splitData,
                        borderColor: '#36A2EB',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        fill: false
                    },
                    {
                        label: 'Merge',
                        data: mergeData,
                        borderColor: '#FFCE56',
                        backgroundColor: 'rgba(255, 206, 86, 0.1)',
                        fill: false
                    },
                    {
                        label: 'Transfer',
                        data: transferData,
                        borderColor: '#4BC0C0',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        fill: false
                    },
                    {
                        label: 'Package',
                        data: packageData,
                        borderColor: '#9966FF',
                        backgroundColor: 'rgba(153, 102, 255, 0.1)',
                        fill: false
                    },
                    {
                        label: 'Optimize',
                        data: optimizeData,
                        borderColor: '#FF9F40',
                        backgroundColor: 'rgba(255, 159, 64, 0.1)',
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        type: 'logarithmic',
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Gas Consumption (Log Scale)'
                        },
                        ticks: {
                            callback: function(value: any) {
                                return Number(value).toLocaleString();
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Test Scale'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'Gas Consumption Scaling Trend'
                    }
                }
            }
        };
    }

    /**
     * Create response time scaling chart
     */
    private createTimeScalingChart(results: ScalingTestResults): ChartConfig {
        const mintData: number[] = [];
        const splitData: number[] = [];
        const mergeData: number[] = [];
        const transferData: number[] = [];
        const packageData: number[] = [];
        const optimizeData: number[] = [];
        const scales: string[] = [];

        const scaleGroups = this.groupMetricsByScale(results.metrics);
        const sortedScales = Object.keys(scaleGroups)
            .map(scale => parseInt(scale))
            .sort((a, b) => a - b)
            .map(scale => scale.toString());
        
        sortedScales.forEach(scale => {
            scales.push(scale);
            const metrics = scaleGroups[scale];
            
            mintData.push(metrics.find(m => m.operation === 'mint')?.avgTime || 0);
            splitData.push(metrics.find(m => m.operation === 'split')?.avgTime || 0);
            mergeData.push(metrics.find(m => m.operation === 'merge')?.avgTime || 0);
            transferData.push(metrics.find(m => m.operation === 'transfer')?.avgTime || 0);
            packageData.push(metrics.find(m => m.operation === 'package')?.avgTime || 0);
            optimizeData.push(metrics.find(m => m.operation === 'optimize')?.avgTime || 0);
        });

        return {
            title: 'Response Time Scaling',
            type: 'line',
            data: {
                labels: scales.map(s => `${s} Operations`),
                datasets: [
                    {
                        label: 'Mint',
                        data: mintData,
                        borderColor: '#FF6384',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        fill: false
                    },
                    {
                        label: 'Split',
                        data: splitData,
                        borderColor: '#36A2EB',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        fill: false
                    },
                    {
                        label: 'Merge',
                        data: mergeData,
                        borderColor: '#FFCE56',
                        backgroundColor: 'rgba(255, 206, 86, 0.1)',
                        fill: false
                    },
                    {
                        label: 'Transfer',
                        data: transferData,
                        borderColor: '#4BC0C0',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        fill: false
                    },
                    {
                        label: 'Package',
                        data: packageData,
                        borderColor: '#9966FF',
                        backgroundColor: 'rgba(153, 102, 255, 0.1)',
                        fill: false
                    },
                    {
                        label: 'Optimize',
                        data: optimizeData,
                        borderColor: '#FF9F40',
                        backgroundColor: 'rgba(255, 159, 64, 0.1)',
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        type: 'logarithmic',
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Response Time (ms, Log Scale)'
                        },
                        ticks: {
                            callback: function(value: any) {
                                return Number(value).toLocaleString() + 'ms';
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Test Scale'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'Response Time Scaling'
                    }
                }
            }
        };
    }

    /**
     * Create throughput performance curve
     */
    private createThroughputChart(results: ScalingTestResults): ChartConfig {
        const throughputData: number[] = [];
        const scales: string[] = [];

        const scaleGroups = this.groupMetricsByScale(results.metrics);
        const sortedScales = Object.keys(scaleGroups)
            .map(scale => parseInt(scale))
            .sort((a, b) => a - b)
            .map(scale => scale.toString());
        
        sortedScales.forEach(scale => {
            scales.push(scale);
            const metrics = scaleGroups[scale];
            
            // Calculate overall throughput (average of all operations)
            const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
            throughputData.push(avgThroughput);
        });

        return {
            title: 'Throughput Performance Curve',
            type: 'area',
            data: {
                labels: scales.map(s => `${s} Operations`),
                datasets: [
                    {
                        label: 'System Throughput (ops/sec)',
                        data: throughputData,
                        borderColor: '#4BC0C0',
                        backgroundColor: 'rgba(75, 192, 192, 0.3)',
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Throughput (Operations/sec)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Test Scale'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'System Throughput Performance Curve'
                    }
                }
            }
        };
    }

    /**
     * Create operation type comparison chart
     */
    private createOperationComparisonChart(results: ScalingTestResults): ChartConfig {
        const operations = ['mint', 'split', 'merge', 'transfer', 'package', 'optimize'];
        const avgTimes: number[] = [];
        const avgGas: number[] = [];

        operations.forEach(op => {
            const opMetrics = results.metrics.filter(m => m.operation === op);
            const avgTime = opMetrics.length > 0 ? opMetrics.reduce((sum, m) => sum + m.avgTime, 0) / opMetrics.length : 0;
            const avgGasValue = opMetrics.length > 0 ? opMetrics.reduce((sum, m) => sum + m.avgGas, 0) / opMetrics.length : 0;
            
            avgTimes.push(avgTime);
            avgGas.push(avgGasValue);
        });

        return {
            title: 'Six Operation Types Performance Comparison',
            type: 'bar',
            data: {
                labels: ['Mint', 'Split', 'Merge', 'Transfer', 'Package', 'Optimize'],
                datasets: [
                    {
                        label: 'Average Response Time (ms)',
                        data: avgTimes,
                        backgroundColor: 'rgba(255, 99, 132, 0.8)',
                        borderColor: '#FF6384'
                    },
                    {
                        label: 'Average Gas Consumption',
                        data: avgGas,
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderColor: '#36A2EB'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Performance Metrics'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'Performance Comparison of Different Operation Types'
                    }
                }
            }
        };
    }

    /**
     * Create gas efficiency analysis chart
     */
    private createGasEfficiencyChart(results: ScalingTestResults): ChartConfig {
        const mintEfficiency: number[] = [];
        const splitEfficiency: number[] = [];
        const mergeEfficiency: number[] = [];
        const scales: string[] = [];

        const scaleGroups = this.groupMetricsByScale(results.metrics);
        const sortedScales = Object.keys(scaleGroups)
            .map(scale => parseInt(scale))
            .sort((a, b) => a - b)
            .map(scale => scale.toString());
        
        sortedScales.forEach(scale => {
            scales.push(scale);
            const metrics = scaleGroups[scale];
            
            // Gas efficiency = Throughput / Gas Consumption (higher is better)
            const mintMetric = metrics.find(m => m.operation === 'mint');
            const splitMetric = metrics.find(m => m.operation === 'split');
            const mergeMetric = metrics.find(m => m.operation === 'merge');
            
            mintEfficiency.push(mintMetric ? mintMetric.throughput / mintMetric.avgGas * 1000 : 0);
            splitEfficiency.push(splitMetric ? splitMetric.throughput / splitMetric.avgGas * 1000 : 0);
            mergeEfficiency.push(mergeMetric ? mergeMetric.throughput / mergeMetric.avgGas * 1000 : 0);
        });

        return {
            title: 'Gas Efficiency Analysis',
            type: 'bar',
            data: {
                labels: scales.map(s => `${s} Operations`),
                datasets: [
                    {
                        label: 'Mint Efficiency',
                        data: mintEfficiency,
                        backgroundColor: 'rgba(255, 99, 132, 0.8)'
                    },
                    {
                        label: 'Split Efficiency',
                        data: splitEfficiency,
                        backgroundColor: 'rgba(54, 162, 235, 0.8)'
                    },
                    {
                        label: 'Merge Efficiency',
                        data: mergeEfficiency,
                        backgroundColor: 'rgba(255, 206, 86, 0.8)'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Gas Efficiency (Throughput/Gas × 1000)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Test Scale'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    },
                    title: {
                        display: true,
                        text: 'Gas Usage Efficiency Analysis (Higher Values are Better)'
                    }
                }
            }
        };
    }

    /**
     * Group metrics by scale
     */
    private groupMetricsByScale(metrics: PerformanceMetrics[]): { [scale: string]: PerformanceMetrics[] } {
        const groups: { [scale: string]: PerformanceMetrics[] } = {};
        
        metrics.forEach(metric => {
            const scale = metric.scale.toString();
            if (!groups[scale]) {
                groups[scale] = [];
            }
            groups[scale].push(metric);
        });
        
        return groups;
    }

    /**
     * Generate PNG images from chart configurations
     */
    async generatePNGImages(chartConfigs: ChartConfig[], filenames: string[]): Promise<string[]> {
        const pngFiles: string[] = [];
        const pngDir = path.join(this.outputDir, 'charts', 'png');
        await fs.ensureDir(pngDir);

        for (let i = 0; i < chartConfigs.length; i++) {
            const config = chartConfigs[i];
            const filename = filenames[i];
            
            try {
                // Prepare configuration for node-canvas  
                const chartType = config.type === 'area' ? 'line' : config.type;
                const chartConfiguration = {
                    type: chartType,
                    data: config.data,
                    options: {
                        ...config.options,
                        animation: false, // Disable animations for static export
                        responsive: false,
                        plugins: {
                            ...config.options.plugins,
                            legend: {
                                ...config.options.plugins?.legend,
                                display: true
                            }
                        }
                    }
                } as any;

                // Generate PNG buffer
                const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(chartConfiguration);
                
                // Save PNG file
                const pngPath = path.join(pngDir, `${filename}.png`);
                await fs.writeFile(pngPath, imageBuffer);
                
                console.log(`🖼️ PNG chart saved: ${filename}.png`);
                pngFiles.push(pngPath);
                
            } catch (error) {
                console.error(`❌ Failed to generate PNG for ${filename}:`, error);
            }
        }

        return pngFiles;
    }

    /**
     * Generate PNG image from a single chart configuration
     */
    async generatePNGImage(chartConfig: ChartConfig, filename: string): Promise<string | null> {
        const pngFiles = await this.generatePNGImages([chartConfig], [filename]);
        return pngFiles.length > 0 ? pngFiles[0] : null;
    }

    /**
     * Save chart configuration to file
     */
    private async saveChart(chartConfig: ChartConfig, filename: string): Promise<string> {
        const chartDir = path.join(this.outputDir, 'charts');
        await fs.ensureDir(chartDir);
        
        const filepath = path.join(chartDir, `${filename}.json`);
        await fs.writeJSON(filepath, chartConfig, { spaces: 2 });
        
        console.log(`📊 Chart configuration saved: ${filename}.json`);
        return filepath;
    }

    /**
     * Generate Chart.js HTML page
     */
    async generateChartHTML(chartConfigs: ChartConfig[], title: string = 'IoT-SFT Performance Analysis Report', showPNGLinks: boolean = false): Promise<string> {
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 30px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { 
            color: #333; 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 3px solid #4BC0C0;
            padding-bottom: 10px;
        }
        .chart-container { 
            margin: 40px 0; 
            padding: 20px; 
            border: 1px solid #e0e0e0; 
            border-radius: 5px;
            background: #fafafa;
        }
        .chart-title { 
            color: #555; 
            margin-bottom: 20px; 
            font-size: 18px; 
            font-weight: bold;
        }
        canvas { 
            max-height: 400px; 
        }
        .summary {
            background: #e8f4fd;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 30px;
            border-left: 5px solid #36A2EB;
        }
        .timestamp {
            color: #888;
            font-size: 14px;
            text-align: center;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <div class="summary">
            <h3>📊 Test Overview</h3>
            <p>This report demonstrates the performance characteristics of the IoT-SFT smart contract at various scales, including key metrics such as Gas Consumption, Response Time, and Throughput.</p>
        </div>
        
        ${chartConfigs.map((config, index) => {
            const chartFilenames = ['gas-scaling-trend', 'time-scaling-trend', 'throughput-curve', 'operation-comparison', 'gas-efficiency'];
            const pngLink = showPNGLinks && index < chartFilenames.length ? 
                `<div style="margin-top: 10px; text-align: right;">
                    <a href="./charts/png/${chartFilenames[index]}.png" target="_blank" style="color: #007acc; text-decoration: none; font-size: 14px;">
                        🖼️ View PNG Version
                    </a>
                </div>` : '';
            
            return `
        <div class="chart-container">
            <div class="chart-title">${config.title}</div>
            <canvas id="chart${index}"></canvas>
            ${pngLink}
        </div>`;
        }).join('')}
        
        <div class="timestamp">
            Report generated: ${new Date().toLocaleString('en-US')}
        </div>
    </div>

    <script>
        ${chartConfigs.map((config, index) => `
        // Chart ${index + 1}: ${config.title}
        const ctx${index} = document.getElementById('chart${index}').getContext('2d');
        new Chart(ctx${index}, ${JSON.stringify({
            type: config.type,
            data: config.data,
            options: config.options
        })});
        `).join('\n')}
    </script>
</body>
</html>`;

        const htmlPath = path.join(this.outputDir, 'reports', `performance-charts-${Date.now()}.html`);
        await fs.ensureDir(path.dirname(htmlPath));
        await fs.writeFile(htmlPath, htmlContent, 'utf8');
        
        console.log(`📄 HTML report generated: ${htmlPath}`);
        return htmlPath;
    }

    /**
     * Get all chart configurations (without saving files)
     */
    async getAllChartConfigs(results: ScalingTestResults): Promise<ChartConfig[]> {
        console.log('📊 Generating chart configurations...');
        
        const chartConfigs = [
            this.createGasScalingChart(results),
            this.createTimeScalingChart(results),
            this.createThroughputChart(results),
            this.createOperationComparisonChart(results),
            this.createGasEfficiencyChart(results)
        ];

        // Generate PNG images if option is enabled
        if (this.options.generatePNG) {
            console.log('🖼️ Converting charts to PNG images...');
            await this.generatePNGImages(chartConfigs, [
                'gas-scaling-trend', 'time-scaling-trend', 'throughput-curve', 
                'operation-comparison', 'gas-efficiency'
            ]);
        }

        return chartConfigs;
    }

    /**
     * Generate complete report with both interactive charts and optional PNG images
     */
    async generateCompleteReport(results: ScalingTestResults, title?: string): Promise<{
        htmlPath: string;
        chartConfigs: ChartConfig[];
        pngFiles?: string[];
    }> {
        console.log('📊 Generating complete performance report...');
        
        const chartConfigs = await this.getAllChartConfigs(results);
        const htmlPath = await this.generateChartHTML(chartConfigs, title, this.options.generatePNG);
        
        const result: any = {
            htmlPath,
            chartConfigs
        };

        if (this.options.generatePNG) {
            const pngFiles = await this.generatePNGImages(chartConfigs, [
                'gas-scaling-trend', 'time-scaling-trend', 'throughput-curve', 
                'operation-comparison', 'gas-efficiency'
            ]);
            result.pngFiles = pngFiles;
        }

        console.log(`✅ Complete report generated at: ${htmlPath}`);
        return result;
    }
}
