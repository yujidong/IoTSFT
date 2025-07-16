import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import fs from 'fs-extra';
import path from 'path';
import type { ScalingTestResults, PerformanceMetrics } from './performance-analyzer';

export interface ChartOptions {
    width: number;
    height: number;
    backgroundColor: string;
}

export class PngChartGenerator {
    private chartJSNodeCanvas: ChartJSNodeCanvas;
    private outputDir: string;

    constructor(options: ChartOptions = { width: 800, height: 600, backgroundColor: 'white' }) {
        this.chartJSNodeCanvas = new ChartJSNodeCanvas({
            width: options.width,
            height: options.height,
            backgroundColour: options.backgroundColor,
        });
        this.outputDir = path.join(process.cwd(), 'performance-reports', 'charts');
    }

    /**
     * Generate所有PNG图表
     */
    async generateAllPngCharts(results: ScalingTestResults): Promise<string[]> {
        console.log('🖼️ StartGeneratePNG格式图表...');
        
        await fs.ensureDir(this.outputDir);
        const chartPaths: string[] = [];

        try {
            // 1. Gas Consumption趋势图
            const gasChartPath = await this.generateGasTrendChart(results.metrics);
            chartPaths.push(gasChartPath);

            // 2. Response Time趋势图
            const timeChartPath = await this.generateTimeTrendChart(results.metrics);
            chartPaths.push(timeChartPath);

            // 3. Throughput图表
            const throughputChartPath = await this.generateThroughputChart(results.metrics);
            chartPaths.push(throughputChartPath);

            console.log(`✅ Generate了 ${chartPaths.length} 个PNG图表`);
        } catch (error) {
            console.log(`⚠️ 图表Generate过程中出现问题: ${error}`);
        }
        
        return chartPaths;
    }

    /**
     * Gas Consumption趋势图
     */
    private async generateGasTrendChart(metrics: PerformanceMetrics[]): Promise<string> {
        const mintData: number[] = [];
        const splitData: number[] = [];
        const mergeData: number[] = [];
        const scales: string[] = [];

        // 按规模分组Data并严格排序
        const scaleGroups = this.groupMetricsByScale(metrics);
        const sortedScales = Object.keys(scaleGroups)
            .map(scale => parseInt(scale))
            .sort((a, b) => a - b)
            .map(scale => scale.toString());
        
        sortedScales.forEach(scale => {
            scales.push(scale);
            const scaleMetrics = scaleGroups[scale];
            
            mintData.push(scaleMetrics.find(m => m.operation === 'mint')?.avgGas || 0);
            splitData.push(scaleMetrics.find(m => m.operation === 'split')?.avgGas || 0);
            mergeData.push(scaleMetrics.find(m => m.operation === 'merge')?.avgGas || 0);
        });
        
        const config: any = {
            type: 'line',
            data: {
                labels: scales.map(s => `${s}次Operation`),
                datasets: [
                    {
                        label: '铸造 (Mint)',
                        data: mintData,
                        borderColor: '#FF6384',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: '分割 (Split)',
                        data: splitData,
                        borderColor: '#36A2EB',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: '合并 (Merge)',
                        data: mergeData,
                        borderColor: '#FFCE56',
                        backgroundColor: 'rgba(255, 206, 86, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Gas Consumption随规模变化趋势'
                    },
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Gas Consumption量'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Test规模'
                        }
                    }
                }
            }
        };

        const buffer = await this.chartJSNodeCanvas.renderToBuffer(config);
        const filepath = path.join(this.outputDir, 'gas-trend.png');
        await fs.writeFile(filepath, buffer);
        console.log(`📊 Gas趋势图已Generate: gas-trend.png`);
        return filepath;
    }

    /**
     * Response Time趋势图
     */
    private async generateTimeTrendChart(metrics: PerformanceMetrics[]): Promise<string> {
        const mintData: number[] = [];
        const splitData: number[] = [];
        const mergeData: number[] = [];
        const scales: string[] = [];

        // 按规模分组Data并严格排序
        const scaleGroups = this.groupMetricsByScale(metrics);
        const sortedScales = Object.keys(scaleGroups)
            .map(scale => parseInt(scale))
            .sort((a, b) => a - b)
            .map(scale => scale.toString());
        
        sortedScales.forEach(scale => {
            scales.push(scale);
            const scaleMetrics = scaleGroups[scale];
            
            mintData.push(scaleMetrics.find(m => m.operation === 'mint')?.avgTime || 0);
            splitData.push(scaleMetrics.find(m => m.operation === 'split')?.avgTime || 0);
            mergeData.push(scaleMetrics.find(m => m.operation === 'merge')?.avgTime || 0);
        });
        
        const config: any = {
            type: 'line',
            data: {
                labels: scales.map(s => `${s}次Operation`),
                datasets: [
                    {
                        label: '铸造 (Mint)',
                        data: mintData,
                        borderColor: '#FF6384',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: '分割 (Split)',
                        data: splitData,
                        borderColor: '#36A2EB',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: '合并 (Merge)',
                        data: mergeData,
                        borderColor: '#FFCE56',
                        backgroundColor: 'rgba(255, 206, 86, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Response Time随规模变化'
                    },
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Response Time (ms)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Test规模'
                        }
                    }
                }
            }
        };

        const buffer = await this.chartJSNodeCanvas.renderToBuffer(config);
        const filepath = path.join(this.outputDir, 'time-trend.png');
        await fs.writeFile(filepath, buffer);
        console.log(`📊 Response Time图已Generate: time-trend.png`);
        return filepath;
    }

    /**
     * Throughput图表
     */
    private async generateThroughputChart(metrics: PerformanceMetrics[]): Promise<string> {
        const mintData: number[] = [];
        const splitData: number[] = [];
        const mergeData: number[] = [];
        const scales: string[] = [];

        // 按规模分组Data并严格排序
        const scaleGroups = this.groupMetricsByScale(metrics);
        const sortedScales = Object.keys(scaleGroups)
            .map(scale => parseInt(scale))
            .sort((a, b) => a - b)
            .map(scale => scale.toString());
        
        sortedScales.forEach(scale => {
            scales.push(scale);
            const scaleMetrics = scaleGroups[scale];
            
            mintData.push(scaleMetrics.find(m => m.operation === 'mint')?.throughput || 0);
            splitData.push(scaleMetrics.find(m => m.operation === 'split')?.throughput || 0);
            mergeData.push(scaleMetrics.find(m => m.operation === 'merge')?.throughput || 0);
        });
        
        const config: any = {
            type: 'line',
            data: {
                labels: scales.map(s => `${s}次`),
                datasets: [
                    {
                        label: '铸造Throughput (ops/sec)',
                        data: mintData,
                        borderColor: '#FF6384',
                        backgroundColor: 'rgba(255, 99, 132, 0.8)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: '分割Throughput (ops/sec)',
                        data: splitData,
                        borderColor: '#36A2EB',
                        backgroundColor: 'rgba(54, 162, 235, 0.8)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: '合并Throughput (ops/sec)',
                        data: mergeData,
                        borderColor: '#FFCE56',
                        backgroundColor: 'rgba(255, 206, 86, 0.8)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'OperationThroughputAnalysis'
                    },
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Throughput (operations/second)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Test规模'
                        }
                    }
                }
            }
        };

        const buffer = await this.chartJSNodeCanvas.renderToBuffer(config);
        const filepath = path.join(this.outputDir, 'throughput.png');
        await fs.writeFile(filepath, buffer);
        console.log(`📊 Throughput图已Generate: throughput.png`);
        return filepath;
    }

    /**
     * 按规模分组指标
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
     * 获取图表的相对路径（用于HTML report）
     */
    getRelativeChartPaths(): string[] {
        return [
            'charts/gas-trend.png',
            'charts/time-trend.png',
            'charts/throughput.png'
        ];
    }
}
