# IoT-SFT: IoT Semi-Fungible Token Contract

A comprehensive Ethereum smart contract implementing IoT device data tokenization using the ERC-3525 Semi-Fungible Token standard, enabling efficient trading and management of IoT data assets.

## Overview

IoT-SFT enables the tokenization of IoT devices and their data as blockchain assets. The project addresses key challenges in IoT data markets by providing fractional ownership, value aggregation, and efficient trading mechanisms for IoT data through Semi-Fungible Tokens.

### Key Features

- **Device Categorization**: Smart grouping of IoT devices by functionality (Environmental, Motion, Control)
- **Fractional Trading**: Split and merge data asset values for micro-transactions
- **Batch Operations**: Gas-optimized bulk operations for enterprise deployment
- **Performance Analysis**: Comprehensive testing and analysis tools for scalability assessment

## IoT Device Types Supported

### Environmental Sensors (Slot 0)
- Temperature, Humidity, Pressure sensors
- Light, Sound, Air Quality monitors
- Weather stations and environmental monitoring equipment

### Motion & Location Devices (Slot 1) 
- Motion sensors, GPS trackers
- Crowd density sensors, Surveillance cameras
- Transportation and logistics tracking devices

### Control & Actuation Systems (Slot 2)
- Smart actuators and controllers
- Industrial automation equipment
- IoT device configuration and command systems

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
npm run test                    # Core functionality tests
npm run test:gas               # Gas consumption analysis
npm run test:performance       # Scalability benchmarks
```

### Deploy Contract
```bash
# Local development
npm run deploy:local

# Testnet deployment (Sepolia)
npm run deploy:sepolia

# Mainnet deployment
npm run deploy:mainnet
```

## Contract Operations

### Minting IoT Data Tokens
```solidity
// Mint 100 value units of TemperatureSensor to address
function mint(address to, DeviceType.TemperatureSensor, 100) external onlyOwner
```

### Value Operations
```solidity
// Split 30 units from token #1 to new token for address
function splitValue(uint256 tokenId, uint256 amount, address to) external

// Merge 25 units from token #1 to token #2  
function mergeValue(uint256 fromTokenId, uint256 toTokenId, uint256 amount) external
```

### Batch Operations
```solidity
// Mint multiple device types in single transaction
function batchMint(address[] addresses, DeviceType[] deviceTypes, uint256[] values) external

// Batch split operations for efficiency
function batchSplit(uint256[] tokenIds, uint256[] amounts, address[] recipients) external
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
└── ignition/modules/           # Deployment modules
```

## Architecture

### ERC-3525 SFT Implementation
- **Slot-based Organization**: Devices grouped by functionality for optimized trading
- **Value Transfer Operations**: Split, merge, and transfer token values efficiently
- **Fractional Ownership**: Enables partial ownership and micro-transactions
- **Gas Optimization**: Batch operations and efficient slot management

### Slot Organization
- **Slot 0**: Environmental sensors (Temperature, Humidity, Pressure, Light, Sound, Air Quality)
- **Slot 1**: Motion & Location sensors (Motion, GPS, Crowd Density, Camera)  
- **Slot 2**: Control devices (Actuators, Controllers)

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

## Use Cases

### Smart City Applications
- **Environmental Monitoring**: Air quality, noise level, weather data tokenization
- **Infrastructure Management**: Traffic sensor data, parking availability, energy consumption
- **Public Safety**: Crowd density monitoring, surveillance camera data

### Industrial IoT
- **Manufacturing**: Production sensor data, quality control metrics
- **Supply Chain**: Logistics tracking, inventory monitoring  
- **Maintenance**: Predictive maintenance data, equipment performance

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
- [Contributing Guide](./CONTRIBUTING.md)
