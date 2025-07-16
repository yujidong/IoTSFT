# IoTSFT 项目部署文档

## 项目概述

IoTSFT是一个基于ERC-3525标准的半同质化代币(SFT)Smart Contract项目，专为物联网Device价值表示和交易而设计。支持IoTDevice代币的铸造、分割和合并Operation。

## 环境要求

### 开发环境
- Node.js >= 16.0.0
- npm >= 8.0.0
- Git

### 区块链环境
- SepoliaTest网络账户（需要TestETH）
- Infura/Alchemy/QuickNode API密钥
- Etherscan API密钥（用于合约验证）

## 快速Start

### 1. 项目Initialize

```bash
# 克隆项目
git clone <your-repo-url>
cd IoTSFT

# 安装依赖
npm install

# 编译合约
npm run build
```

### 2. 环境Configuration

复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件，Configuration以下参数：

```bash
# 网络Configuration
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
MAINNET_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID

# 私钥Configuration（请使用Test账户）
PRIVATE_KEY=your_private_key_here

# Etherscan API密钥
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Test configuration
DEFAULT_RECIPIENT_ADDRESS=0x8908865F3dc2D7D26237da944F0a2dcDC7B01859
```

⚠️ **安全提示**：
- 永远不要在代码中硬编码私钥
- 不要将 `.env` 文件提交到版本控制
- 生产环境使用专用的部署账户

### 3. 运行Test

```bash
# 运行基本Test
npm test

# 运行GasEfficiencyTest
npm run test:gas

# 运行PerformanceTest
npm run test:performance
```

## 部署指南

### 本地部署（开发Test）

1. **启动本地网络**：
```bash
npm run node
```

2. **部署到本地网络**：
```bash
npm run deploy:local
```

### SepoliaTest网部署

1. **确保账户有足够ETH**：
   - 访问 [Sepolia Faucet](https://sepoliafaucet.com/) 获取TestETH
   - 至少需要 0.01 ETH 用于部署

2. **部署合约**：
```bash
npm run deploy:sepolia
```

3. **验证合约**：
```bash
npm run verify:sepolia
```

4. **更新环境变量**：
将部署输出的合约地址更新到 `.env` 文件：
```bash
CONTRACT_ADDRESS_SEPOLIA=0xYourContractAddress
```

### 主网部署

⚠️ **主网部署需要特别谨慎**

1. **准备工作**：
   - 确保充分Test
   - 准备足够的ETH（建议至少0.1 ETH）
   - 使用专用的生产账户
   - 设置适当的Gas价格

2. **部署到主网**：
```bash
npm run deploy:mainnet
```

3. **验证合约**：
```bash
npm run verify:mainnet
```

## 使用指南

### 基本Operation

#### 铸造代币
```bash
# 使用CLI工具铸造
npm run cli mint --type 0 --value 100 --recipient 0xRecipientAddress

# 或使用预设脚本
npm run mint
```

#### 分割代币
```bash
npm run cli split --tokenId 1 --amount 50 --recipient 0xRecipientAddress
```

#### 合并代币
```bash
npm run cli merge --from 1 --to 2 --amount 30
```

#### 查询信息
```bash
# 查询合约信息
npm run cli info --contract

# 查询代币信息
npm run cli info --tokenId 1
```

### 批量Operation

#### 批量铸造
```bash
npm run cli batch-mint --count 10 --type 0 --value 100
```

#### Performance基准Test
```bash
npm run cli benchmark --operations 20
```

## PerformanceTest

### GasEfficiencyTest
```bash
npm run test:gas
```

Test内容：
- 各Operation的Gas Consumption基准
- 批量Operation的EfficiencyAnalysis
- Gas Consumption趋势Analysis

### 并发PerformanceTest
```bash
npm run perf:multi
```

Test内容：
- 多用户并发Operation
- 网络拥堵模拟
- 混合OperationPerformance

### 规模化Test
```bash
npm run perf:multi-full
```

Test内容：
- 大规模铸造Test
- 连续分割Test
- 压力Test

## 监控和Analysis

### Gas费用Analysis

每个Operation的预期Gas Consumption：
- **部署**: ~2,500,000 Gas
- **铸造**: ~200,000 Gas
- **分割**: ~250,000 Gas
- **合并**: ~150,000 Gas

### Performance基准

在SepoliaTest网的典型Performance：
- 交易确认时间: 15-30秒
- 并发OperationSuccess Rate: >90%
- 大规模Operation稳定性: 支持连续50+Operation

## 故障排除

### 常见问题

#### 1. "insufficient funds for gas"
**原因**: 账户ETH余额不足
**解决**: 从水龙头获取更多TestETH

#### 2. "nonce too low"
**原因**: 交易nonce冲突
**解决**: 等待之前的交易确认或重置MetaMask

#### 3. "contract not verified"
**原因**: 合约验证失败
**解决**: 
- 检查Etherscan API密钥
- 确认构造参数正确
- 等待区块确认后重试

#### 4. Gas估算错误
**原因**: Gas price设置不当
**解决**: 调整 `.env` 中的 `GAS_PRICE_GWEI` 参数

### 调试技巧

1. **启用详细日志**：
```bash
ENABLE_LOGGING=true npm run deploy:sepolia
```

2. **使用Hardhat Console**：
```bash
npx hardhat console --network sepolia
```

3. **查看交易详情**：
访问 [Sepolia Etherscan](https://sepolia.etherscan.io/) 查看交易状态

## 安全最佳实践

### 私钥管理
- 使用环境变量存储私钥
- 生产环境使用硬件钱包
- 定期轮换Test账户
- 避免在日志中暴露敏感信息

### Smart Contract安全
- 充分Test所有功能
- 进行安全审计
- 监控异常交易
- 实施访问控制

### 部署安全
- 验证部署参数
- Test网完整验证
- 渐进式主网部署
- 建立监控机制

## API参考

### Smart Contract方法

#### mint(address to, DeviceType deviceType, uint256 value)
铸造新的IoTDevice代币

#### splitValue(uint256 tokenId, uint256 amount, address to)
分割代币价值

#### mergeValue(uint256 fromTokenId, uint256 toTokenId, uint256 amount)
合并代币价值

### CLI命令参考

详细的CLI命令使用说明请参考：
```bash
npm run cli --help
```

## 更新日志

### v1.0.0 (当前版本)
- 实现基本的ERC-3525功能
- 支持两 device types（温度传感器、人群密度传感器）
- 完整的Test套件
- CLI工具集成
- PerformanceOptimization

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 技术支持

如遇到问题，请：
1. 查看本文档的故障排除部分
2. 查看项目的 Issues
3. 提交新的 Issue（包含详细的错误信息和复现步骤）

## 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。
