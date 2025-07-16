import fs from "fs-extra";
import path from "path";
import handlebars from "handlebars";
import type { ScalingTestResults, PerformanceMetrics } from "./performance-analyzer";
import type { ChartConfig } from "./chart-generator";

export interface ReportData {
    title: string;
    timestamp: string;
    summary: {
        totalOperations: number;
        totalTime: number;
        totalGas: string;
        avgThroughput: number;
        environment: string;
    };
    metrics: PerformanceMetrics[];
    charts: ChartConfig[];
    recommendations: string[];
}

export class ReportGenerator {
    private outputDir: string;
    private templatesDir: string;

    constructor() {
        this.outputDir = path.join(process.cwd(), 'performance-reports');
        this.templatesDir = path.join(this.outputDir, 'templates');
    }

    /**
     * Generate完整的PerformanceAnalysisReport
     */
    async generateCompleteReport(
        testResults: ScalingTestResults, 
        charts: ChartConfig[]
    ): Promise<string> {
        console.log('📄 StartGenerate完整PerformanceReport...');

        // 准备ReportData
        const reportData = this.prepareReportData(testResults, charts);
        
        // 确保模板存在
        await this.ensureTemplateExists();
        
        // GenerateHTML report
        const htmlPath = await this.generateHTML report(reportData);
        
        // GenerateCSV data文件
        await this.generateCSVReport(testResults);
        
        // GenerateJSONData文件
        await this.generateJSONReport(testResults);
        
        console.log(`✅ 完整ReportGenerateComplete: ${htmlPath}`);
        return htmlPath;
    }

    /**
     * 准备ReportData
     */
    private prepareReportData(results: ScalingTestResults, charts: ChartConfig[]): ReportData {
        const recommendations = this.generateRecommendations(results);
        
        return {
            title: 'IoT-SFT Smart ContractPerformanceAnalysisReport',
            timestamp: new Date().toLocaleString('zh-CN'),
            summary: {
                totalOperations: results.summary.totalOperations,
                totalTime: results.summary.totalTime,
                totalGas: results.summary.totalGas.toString(),
                avgThroughput: Math.round(results.summary.avgThroughput * 100) / 100,
                environment: results.environment
            },
            metrics: results.metrics,
            charts,
            recommendations
        };
    }

    /**
     * GeneratePerformanceOptimization建议
     */
    private generateRecommendations(results: ScalingTestResults): string[] {
        const recommendations: string[] = [];
        
        // AnalysisGas Consumption
        const avgGasByOperation = this.calculateAverageGasByOperation(results.metrics);
        const highestGasOp = Object.entries(avgGasByOperation).reduce((max, [op, gas]) => 
            gas > max.gas ? { operation: op, gas } : max, { operation: '', gas: 0 });
        
        if (highestGasOp.gas > 200000) {
            recommendations.push(`${this.getOperationName(highestGasOp.operation)}Operation的Gas Consumption较高 (${highestGasOp.gas.toFixed(0)})，建议Optimization合约逻辑以降低Gas成本。`);
        }
        
        // AnalysisResponse Time
        const avgTimeByOperation = this.calculateAverageTimeByOperation(results.metrics);
        const slowestOp = Object.entries(avgTimeByOperation).reduce((max, [op, time]) => 
            time > max.time ? { operation: op, time } : max, { operation: '', time: 0 });
        
        if (slowestOp.time > 5000) {
            recommendations.push(`${this.getOperationName(slowestOp.operation)}OperationResponse Time较长 (${slowestOp.time.toFixed(1)}ms)，可能需要Optimization网络Configuration或区块链节点Performance。`);
        }
        
        // AnalysisThroughput
        if (results.summary.avgThroughput < 1) {
            recommendations.push('系统整体Throughput较低，建议考虑批量Operation或并行处理来提高Performance。');
        }
        
        // Analysis规模化Performance
        const scaleAnalysis = this.analyzeScalingPerformance(results.metrics);
        if (scaleAnalysis.degradation > 0.3) {
            recommendations.push(`Performance随规模增长出现明显下降 (${(scaleAnalysis.degradation * 100).toFixed(1)}%)，建议实施PerformanceOptimization策略。`);
        }
        
        // 通用建议
        recommendations.push('建议定期进行Performance回归Test，监控合约Performance变化趋势。');
        recommendations.push('考虑在生产环境中实施Gas费用Optimization和交易并行处理。');
        
        if (recommendations.length === 2) {
            recommendations.unshift('🎉 当前Performance表现良好，各项指标均在合理范围内。');
        }
        
        return recommendations;
    }

    /**
     * Analysis规模化Performance下降
     */
    private analyzeScalingPerformance(metrics: PerformanceMetrics[]): { degradation: number } {
        const mintMetrics = metrics.filter(m => m.operation === 'mint').sort((a, b) => a.scale - b.scale);
        
        if (mintMetrics.length < 2) return { degradation: 0 };
        
        const firstThroughput = mintMetrics[0].throughput;
        const lastThroughput = mintMetrics[mintMetrics.length - 1].throughput;
        
        const degradation = Math.max(0, (firstThroughput - lastThroughput) / firstThroughput);
        return { degradation };
    }

    /**
     * 计算各Operation平均Gas Consumption
     */
    private calculateAverageGasByOperation(metrics: PerformanceMetrics[]): { [operation: string]: number } {
        const result: { [operation: string]: number } = {};
        const operations = ['mint', 'split', 'merge'];
        
        operations.forEach(op => {
            const opMetrics = metrics.filter(m => m.operation === op);
            if (opMetrics.length > 0) {
                result[op] = opMetrics.reduce((sum, m) => sum + m.avgGas, 0) / opMetrics.length;
            }
        });
        
        return result;
    }

    /**
     * 计算各Operation平均Response Time
     */
    private calculateAverageTimeByOperation(metrics: PerformanceMetrics[]): { [operation: string]: number } {
        const result: { [operation: string]: number } = {};
        const operations = ['mint', 'split', 'merge'];
        
        operations.forEach(op => {
            const opMetrics = metrics.filter(m => m.operation === op);
            if (opMetrics.length > 0) {
                result[op] = opMetrics.reduce((sum, m) => sum + m.avgTime, 0) / opMetrics.length;
            }
        });
        
        return result;
    }

    /**
     * 获取Operation名称的中文翻译
     */
    private getOperationName(operation: string): string {
        const names: { [key: string]: string } = {
            'mint': '铸造',
            'split': '分割',
            'merge': '合并'
        };
        return names[operation] || operation;
    }

    /**
     * 确保Report模板存在
     */
    private async ensureTemplateExists(): Promise<void> {
        await fs.ensureDir(this.templatesDir);
        
        const templatePath = path.join(this.templatesDir, 'report-template.hbs');
        
        if (!(await fs.pathExists(templatePath))) {
            await this.createReportTemplate(templatePath);
        }
    }

    /**
     * 创建Report模板
     */
    private async createReportTemplate(templatePath: string): Promise<void> {
        const template = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 12px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 { 
            margin: 0; 
            font-size: 2.5em; 
            font-weight: 300;
        }
        .header .subtitle {
            margin-top: 10px;
            font-size: 1.1em;
            opacity: 0.9;
        }
        .content { padding: 30px; }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            border-left: 5px solid #4facfe;
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #333;
            font-size: 1.1em;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #4facfe;
            margin: 10px 0;
        }
        .summary-card .unit {
            color: #666;
            font-size: 0.9em;
        }
        
        .section {
            margin: 40px 0;
            padding: 20px;
            border-radius: 8px;
            background: #fafbfc;
        }
        .section h2 {
            color: #333;
            margin: 0 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
            font-size: 1.5em;
        }
        
        .chart-container { 
            margin: 30px 0; 
            padding: 25px; 
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .chart-title { 
            color: #333; 
            margin-bottom: 20px; 
            font-size: 1.2em; 
            font-weight: 600;
            text-align: center;
        }
        canvas { 
            max-height: 400px; 
        }
        
        .metrics-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .metrics-table th {
            background: #4facfe;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        .metrics-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e9ecef;
        }
        .metrics-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        .metrics-table tr:hover {
            background: #e3f2fd;
        }
        
        .recommendations {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
        }
        .recommendations h3 {
            color: #856404;
            margin: 0 0 15px 0;
        }
        .recommendations ul {
            margin: 0;
            padding-left: 20px;
        }
        .recommendations li {
            margin: 8px 0;
            color: #856404;
            line-height: 1.5;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
            border-top: 1px solid #e9ecef;
            margin-top: 40px;
        }
        
        .operation-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }
        .operation-mint { background: #ffeaa7; color: #fdcb6e; }
        .operation-split { background: #a8e6cf; color: #00b894; }
        .operation-merge { background: #fd79a8; color: #e84393; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{title}}</h1>
            <div class="subtitle">Generate时间: {{timestamp}}</div>
        </div>
        
        <div class="content">
            <!-- 概览摘要 -->
            <div class="section">
                <h2>📊 Test概览</h2>
                <div class="summary-grid">
                    <div class="summary-card">
                        <h3>总Operation数</h3>
                        <div class="value">{{summary.totalOperations}}</div>
                        <div class="unit">次Operation</div>
                    </div>
                    <div class="summary-card">
                        <h3>总耗时</h3>
                        <div class="value">{{formatTime summary.totalTime}}</div>
                        <div class="unit">毫秒</div>
                    </div>
                    <div class="summary-card">
                        <h3>总Gas Consumption</h3>
                        <div class="value">{{formatGas summary.totalGas}}</div>
                        <div class="unit">Gas</div>
                    </div>
                    <div class="summary-card">
                        <h3>平均Throughput</h3>
                        <div class="value">{{summary.avgThroughput}}</div>
                        <div class="unit">ops/sec</div>
                    </div>
                </div>
                <p><strong>Test环境:</strong> {{summary.environment}}</p>
            </div>
            
            <!-- Performance图表 -->
            <div class="section">
                <h2>📈 Performance图表</h2>
                
                <div class="chart-container">
                    <div class="chart-title">Gas Consumption趋势Analysis</div>
                    <img src="../charts/gas-trend.png" alt="Gas Consumption趋势图" style="width: 100%; max-width: 800px; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                </div>
                
                <div class="chart-container">
                    <div class="chart-title">Response Time趋势Analysis</div>
                    <img src="../charts/time-trend.png" alt="Response Time趋势图" style="width: 100%; max-width: 800px; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                </div>
                
                <div class="chart-container">
                    <div class="chart-title">OperationThroughputAnalysis</div>
                    <img src="../charts/throughput.png" alt="Throughput图表" style="width: 100%; max-width: 800px; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                </div>
            </div>
            
            <!-- 详细指标 -->
            <div class="section">
                <h2>📋 详细Performance指标</h2>
                <table class="metrics-table">
                    <thead>
                        <tr>
                            <th>OperationType</th>
                            <th>Test规模</th>
                            <th>平均Response Time</th>
                            <th>平均Gas Consumption</th>
                            <th>最短时间</th>
                            <th>最长时间</th>
                            <th>Throughput</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{#each metrics}}
                        <tr>
                            <td><span class="operation-badge operation-{{this.operation}}">{{getOperationName this.operation}}</span></td>
                            <td>{{this.scale}}</td>
                            <td>{{formatNumber this.avgTime}}ms</td>
                            <td>{{formatNumber this.avgGas}}</td>
                            <td>{{this.minTime}}ms</td>
                            <td>{{this.maxTime}}ms</td>
                            <td>{{formatNumber this.throughput}} ops/sec</td>
                        </tr>
                        {{/each}}
                    </tbody>
                </table>
            </div>
            
            <!-- Optimization建议 -->
            <div class="section">
                <div class="recommendations">
                    <h3>💡 PerformanceOptimization建议</h3>
                    <ul>
                        {{#each recommendations}}
                        <li>{{this}}</li>
                        {{/each}}
                    </ul>
                </div>
            </div>
        </div>
        
        <div class="footer">
            IoT-SFT Smart ContractPerformanceAnalysisReport | 由 Performance Analyzer 自动Generate
        </div>
    </div>

    <script>
        {{#each charts}}
        // Chart {{@index}}: {{this.title}}
        const ctx{{@index}} = document.getElementById('chart{{@index}}').getContext('2d');
        new Chart(ctx{{@index}}, {{{toJSON this}}});
        {{/each}}
    </script>
</body>
</html>`;

        await fs.writeFile(templatePath, template, 'utf8');
        console.log('📝 Report模板已创建');
    }

    /**
     * GenerateHTML report
     */
    private async generateHTML report(reportData: ReportData): Promise<string> {
        const templatePath = path.join(this.templatesDir, 'report-template.hbs');
        const templateContent = await fs.readFile(templatePath, 'utf8');
        
        // 注册Handlebars助手函数
        this.registerHandlebarsHelpers();
        
        const template = handlebars.compile(templateContent);
        const html = template(reportData);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const htmlPath = path.join(this.outputDir, 'reports', `performance-report-${timestamp}.html`);
        
        await fs.ensureDir(path.dirname(htmlPath));
        await fs.writeFile(htmlPath, html, 'utf8');
        
        console.log(`📄 HTML report已Generate: ${htmlPath}`);
        return htmlPath;
    }

    /**
     * 注册Handlebars助手函数
     */
    private registerHandlebarsHelpers(): void {
        handlebars.registerHelper('formatTime', (time: number) => {
            return new Intl.NumberFormat('zh-CN').format(time);
        });
        
        handlebars.registerHelper('formatGas', (gas: string) => {
            return new Intl.NumberFormat('zh-CN').format(parseInt(gas));
        });
        
        handlebars.registerHelper('formatNumber', (num: number) => {
            return Math.round(num * 100) / 100;
        });
        
        handlebars.registerHelper('getOperationName', (operation: string) => {
            const names: { [key: string]: string } = {
                'mint': '铸造',
                'split': '分割',
                'merge': '合并'
            };
            return names[operation] || operation;
        });
        
        handlebars.registerHelper('toJSON', (obj: any) => {
            return JSON.stringify(obj);
        });
    }

    /**
     * GenerateCSVReport
     */
    private async generateCSVReport(results: ScalingTestResults): Promise<string> {
        const csvRows = [
            ['OperationType', 'Test规模', '实际Operation数', '平均Response Time(ms)', '平均Gas Consumption', '最短时间(ms)', '最长时间(ms)', '理论Throughput(ops/sec)', '实际Throughput(ops/sec)']
        ];
        
        results.metrics.forEach(metric => {
            csvRows.push([
                metric.operation,
                metric.scale.toString(),
                (metric.operationCount || metric.times.length).toString(),
                metric.avgTime.toFixed(2),
                metric.avgGas.toFixed(0),
                metric.minTime.toString(),
                metric.maxTime.toString(),
                metric.throughput.toFixed(2),
                (metric.actualThroughput || metric.throughput).toFixed(2)
            ]);
        });
        
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const csvPath = path.join(this.outputDir, 'data', `performance-data-${timestamp}.csv`);
        
        await fs.ensureDir(path.dirname(csvPath));
        await fs.writeFile(csvPath, csvContent, 'utf8');
        
        console.log(`📊 CSV data已导出: ${csvPath}`);
        return csvPath;
    }

    /**
     * GenerateJSONReport
     */
    private async generateJSONReport(results: ScalingTestResults): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const jsonPath = path.join(this.outputDir, 'data', `performance-full-${timestamp}.json`);
        
        // 转换BigInt为字符串避免序列化问题
        const serializableResults = {
            ...results,
            summary: {
                ...results.summary,
                totalGas: results.summary.totalGas.toString()
            }
        };
        
        await fs.ensureDir(path.dirname(jsonPath));
        await fs.writeJSON(jsonPath, serializableResults, { spaces: 2 });
        
        console.log(`💾 完整JSONData已保存: ${jsonPath}`);
        return jsonPath;
    }
}
