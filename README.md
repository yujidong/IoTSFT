# IoT-SFT: IoT Semi-Fungible Token Contract

A comprehensive Ethereum smart contract implementing IoT device representation as Semi-Fungible Tokens (SFTs) using the ERC-3525 standard.

## Overview

IoT-SFT enables the tokenization of IoT devices and their data as blockchain assets. Each device type is represented as a Semi-Fungible Token that can hold value, be split, merged, and transferred while maintaining device-specific characteristics.

## Features

### 🔧 Device Types Supported
- **Environmental Sensors**: Temperature, Humidity, Pressure, Light, Sound, Air Quality
- **Motion & Location**: Motion Sensors, GPS Trackers, Crowd Density Sensors  
- **Smart Devices**: Cameras, Actuators, Controllers

### 🏗️ ERC-3525 SFT Capabilities
- **Slot-based Organization**: Devices grouped by functionality (Environmental, Motion, Control)
- **Value Operations**: Split, merge, and transfer token values
- **Fractional Ownership**: Partial value transfers and splitting
- **Batch Operations**: Efficient multi-token operations

### 📊 Performance Analysis Suite
- **Multi-dimensional Analysis**: Device scalability across types and token counts
- **Gas Efficiency Reports**: Detailed cost analysis for all operations
- **Visual Charts**: PNG chart generation for performance metrics
- **CLI Tools**: Command-line interface for testing and analysis

## Quick Start

### Prerequisites
```bash
npm install
```

### Compile Contract
```bash
npm run build
```

### Run Tests
```bash
npm run test
npm run test:gas          # With gas reporting
npm run test:performance  # Performance tests
```

### Deploy Contract
```bash
# Local development
npm run deploy:local

# Testnet deployment
npm run deploy:sepolia
```

## Performance Analysis

### Quick Performance Test
```bash
npm run perf:quick
```

### Multi-dimensional Analysis
```bash
# Small scale test
npm run perf:multi-small

# Full scale analysis  
npm run perf:multi-full
```

### Generate Performance Charts
```bash
# PNG chart generation
npm run perf:png-demo
npm run perf:png-custom
```

## Contract Operations

### Minting Tokens
```solidity
// Mint 100 value units of TemperatureSensor to address
mint(address, DeviceType.TemperatureSensor, 100)
```

### Value Operations
```solidity
// Split 30 units from token #1 to new token for address
splitValue(tokenId: 1, amount: 30, to: address)

// Merge 25 units from token #1 to token #2  
mergeValue(fromTokenId: 1, toTokenId: 2, amount: 25)
```

### Batch Operations
```solidity
// Mint multiple device types in single transaction
batchMint(addresses[], deviceTypes[], values[])

// Batch split operations
batchSplit(tokenIds[], amounts[], recipients[])
```

## Project Structure

```
├── contracts/
│   └── IoTSFT.sol              # Main SFT contract
├── scripts/
│   ├── cli-tools.ts            # Primary CLI interface
│   ├── multi-dimensional-analyzer.ts  # Performance analysis
│   ├── chart-generator.ts      # Chart generation
│   ├── deploy.ts              # Deployment script
│   └── verify.ts              # Contract verification
├── test/
│   ├── IoTSFT.test.ts         # Core contract tests
│   └── performance/
│       └── scalability.test.ts # Performance tests
└── ignition/modules/           # Deployment modules
```

## Development

### Available Scripts
```bash
npm run build           # Compile contracts
npm run test           # Run all tests
npm run clean          # Clean build artifacts
npm run coverage       # Generate test coverage
npm run node           # Start local Hardhat node
```

### Environment Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` file with required environment variables
4. Compile contracts: `npm run build`
5. Run tests: `npm run test`

## Architecture

### Slot Organization
- **Slot 0**: Environmental sensors (Temperature, Humidity, Pressure, Light, Sound, Air Quality)
- **Slot 1**: Motion & Location sensors (Motion, GPS, Crowd Density, Camera)  
- **Slot 2**: Control devices (Actuators, Controllers)

### Gas Optimization
- Batch operations for reduced transaction costs
- Efficient slot-based organization
- Optimized value transfer mechanisms

## License

This project is licensed under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the full test suite
6. Submit a pull request

## Documentation

- [ERC-3525 Standard](https://eips.ethereum.org/EIPS/eip-3525)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Performance Analysis Guide](./OPERATIONS_PERFORMANCE_GUIDE.md)
