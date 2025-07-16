# IoT-SFT Deployment Guide

## Overview

IoT-SFT is a Semi-Fungible Token (SFT) smart contract project based on the ERC-3525 standard, designed for IoT device value representation and trading. It supports minting, splitting, and merging operations for IoT device tokens.

## Quick Start

### Environment Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables by creating `.env` file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Deployment

#### Local Deployment
```bash
npm run deploy:local
```

#### Testnet Deployment (Sepolia)
```bash
npm run deploy:sepolia
```

#### Mainnet Deployment
```bash
npm run deploy:mainnet
```

## CLI Usage

### Deploy Contract
```bash
npm run cli deploy --name "IoT SFT" --symbol "IOTSFT"
```

### Mint Tokens
```bash
npm run cli mint --type 0 --value 100 --recipient 0xRecipientAddress
```

### Split Tokens
```bash
npm run cli split --tokenId 1 --amount 50 --recipient 0xRecipientAddress
```

### Merge Tokens
```bash
npm run cli merge --from 1 --to 2 --amount 25
```

### Query Information
```bash
# Contract info
npm run cli info --contract

# Token info
npm run cli info --tokenId 1
```

## Performance Testing

### Quick Performance Check
```bash
npm run perf:quick
```

### Multi-dimensional Analysis
```bash
npm run perf:multi-small
npm run perf:multi-full
```

### Generate Performance Charts
```bash
npm run perf:png-demo
npm run perf:png-custom
```

## Configuration

### Environment Variables

Required variables in `.env`:
- `SEPOLIA_URL`: Sepolia testnet RPC URL
- `MAINNET_URL`: Mainnet RPC URL (optional)
- `PRIVATE_KEY`: Deployer account private key
- `ETHERSCAN_API_KEY`: For contract verification
- `CONTRACT_ADDRESS_SEPOLIA`: Contract address after deployment

### Security Notes

- Never commit real private keys to version control
- Use test accounts for development
- Store private keys in environment variables
- Verify contract addresses before transactions

## Monitoring and Analysis

### Gas Usage Analysis

Expected gas consumption per operation:
- **Deployment**: ~2,500,000 Gas
- **Minting**: ~200,000 Gas
- **Splitting**: ~180,000 Gas
- **Merging**: ~160,000 Gas

### Performance Testing
```bash
npm run perf:multi
```

### Scaling Testing
```bash
npm run perf:multi-full
```

## Troubleshooting

### Common Issues

1. **Contract not found**: Ensure `CONTRACT_ADDRESS_SEPOLIA` is set in `.env`
2. **Insufficient gas**: Increase gas limit in transaction
3. **Network issues**: Check RPC URL configuration
4. **Permission denied**: Ensure account has sufficient ETH and permissions

### Support

For technical support and questions:
- Check the README.md for basic usage
- Review performance reports in `./performance-reports/`
- Run diagnostic tests using CLI tools
