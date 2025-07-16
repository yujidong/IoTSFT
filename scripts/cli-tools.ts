import { ethers } from "hardhat";
import type { IoTSFT } from "../typechain-types";
import dotenv from "dotenv";
import { Command } from "commander";

// 加载环境变量
dotenv.config();

// 创建CLI程序
const program = new Command();

// 辅助函数：获取合约实例
async function getContract() {
    const contractAddress = process.env.CONTRACT_ADDRESS_SEPOLIA;
    if (!contractAddress) {
        throw new Error("❌ 未找到合约地址，请在.env文件中设置CONTRACT_ADDRESS_SEPOLIA");
    }
    
    const [signer] = await ethers.getSigners();
    const IoTSFTFactory = await ethers.getContractFactory("IoTSFT");
    const contract = IoTSFTFactory.attach(contractAddress).connect(signer) as IoTSFT;
    
    return { contract, signer, contractAddress };
}

// 辅助函数：格式化输出
function formatTokenInfo(tokenId: number, balance: bigint, slot: bigint, owner: string) {
    console.log(`🎫 代币 #${tokenId}:`);
    console.log(`   💰 余额: ${balance.toString()}`);
    console.log(`   🎰 Slot: ${slot.toString()} (${slot.toString() === '0' ? '温度传感器' : '人群密度传感器'})`);
    console.log(`   👤 所有者: ${owner}`);
}

// 程序基本信息
program
    .name('iot-sft-cli')
    .description('IoT SFT 智能合约命令行工具')
    .version('1.0.0');

// 部署命令
program
    .command('deploy')
    .description('部署IoTSFT合约')
    .option('-n, --name <name>', '合约名称', 'IoT Semi-Fungible Token')
    .option('-s, --symbol <symbol>', '合约符号', 'IOTSFT')
    .option('-d, --decimals <decimals>', '小数位数', '18')
    .action(async (options) => {
        try {
            console.log('🚀 开始部署IoTSFT合约...');
            
            const [deployer] = await ethers.getSigners();
            console.log(`👤 部署账户: ${deployer.address}`);
            
            const IoTSFTFactory = await ethers.getContractFactory("IoTSFT");
            const iotSFT = await IoTSFTFactory.deploy(
                options.name,
                options.symbol,
                parseInt(options.decimals)
            );
            
            await iotSFT.waitForDeployment();
            const contractAddress = await iotSFT.getAddress();
            
            console.log('✅ 合约部署成功!');
            console.log(`📍 合约地址: ${contractAddress}`);
            console.log(`💡 请更新.env文件: CONTRACT_ADDRESS_SEPOLIA=${contractAddress}`);
            
        } catch (error) {
            console.error('❌ 部署失败:', error);
            process.exit(1);
        }
    });

// 铸造命令
program
    .command('mint')
    .description('铸造IoT代币')
    .option('-t, --type <type>', '设备类型 (0=温度传感器, 1=人群密度传感器)', '0')
    .option('-v, --value <value>', '代币价值', '100')
    .option('-r, --recipient <address>', '接收地址')
    .action(async (options) => {
        try {
            const { contract, signer } = await getContract();
            
            const recipient = options.recipient || signer.address;
            const deviceType = parseInt(options.type);
            const value = parseInt(options.value);
            
            console.log('🚀 开始铸造IoT代币...');
            console.log(`👤 接收地址: ${recipient}`);
            console.log(`🔧 设备类型: ${deviceType} (${deviceType === 0 ? '温度传感器' : '人群密度传感器'})`);
            console.log(`💰 代币价值: ${value}`);
            
            const tx = await contract.mint(recipient, deviceType, value);
            console.log(`📝 交易已提交: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log('✅ 铸造成功!');
            console.log(`⛽ Gas使用量: ${receipt!.gasUsed.toString()}`);
            
        } catch (error) {
            console.error('❌ 铸造失败:', error);
            process.exit(1);
        }
    });

// 分割命令
program
    .command('split')
    .description('分割IoT代币')
    .requiredOption('-i, --tokenId <tokenId>', '要分割的代币ID')
    .requiredOption('-a, --amount <amount>', '分割数量')
    .requiredOption('-r, --recipient <address>', '接收新代币的地址')
    .action(async (options) => {
        try {
            const { contract } = await getContract();
            
            const tokenId = parseInt(options.tokenId);
            const amount = parseInt(options.amount);
            const recipient = options.recipient;
            
            // 检查代币信息
            const balance = await contract["balanceOf(uint256)"](tokenId);
            const slot = await contract.slotOf(tokenId);
            const owner = await contract.ownerOf(tokenId);
            
            console.log('✂️ 开始分割IoT代币...');
            formatTokenInfo(tokenId, balance, slot, owner);
            console.log(`📤 分割数量: ${amount}`);
            console.log(`👤 接收地址: ${recipient}`);
            
            if (balance < amount) {
                console.error(`❌ 余额不足: 当前余额 ${balance.toString()}, 需要 ${amount}`);
                process.exit(1);
            }
            
            const tx = await contract.splitValue(tokenId, amount, recipient);
            console.log(`📝 交易已提交: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log('✅ 分割成功!');
            console.log(`⛽ Gas使用量: ${receipt!.gasUsed.toString()}`);
            
            // 显示分割后状态
            const newBalance = await contract["balanceOf(uint256)"](tokenId);
            console.log(`📊 分割后原代币余额: ${newBalance.toString()}`);
            
        } catch (error) {
            console.error('❌ 分割失败:', error);
            process.exit(1);
        }
    });

// 合并命令
program
    .command('merge')
    .description('合并IoT代币价值')
    .requiredOption('-f, --from <fromTokenId>', '源代币ID')
    .requiredOption('-t, --to <toTokenId>', '目标代币ID')
    .requiredOption('-a, --amount <amount>', '转移数量')
    .action(async (options) => {
        try {
            const { contract } = await getContract();
            
            const fromTokenId = parseInt(options.from);
            const toTokenId = parseInt(options.to);
            const amount = parseInt(options.amount);
            
            // 检查代币信息
            const fromBalance = await contract["balanceOf(uint256)"](fromTokenId);
            const toBalance = await contract["balanceOf(uint256)"](toTokenId);
            const fromSlot = await contract.slotOf(fromTokenId);
            const toSlot = await contract.slotOf(toTokenId);
            
            console.log('🔄 开始合并IoT代币价值...');
            console.log('📤 源代币:');
            formatTokenInfo(fromTokenId, fromBalance, fromSlot, await contract.ownerOf(fromTokenId));
            console.log('📥 目标代币:');
            formatTokenInfo(toTokenId, toBalance, toSlot, await contract.ownerOf(toTokenId));
            console.log(`💰 转移数量: ${amount}`);
            
            if (fromSlot !== toSlot) {
                console.error(`❌ 代币Slot不匹配: 源代币Slot ${fromSlot.toString()}, 目标代币Slot ${toSlot.toString()}`);
                process.exit(1);
            }
            
            if (fromBalance < amount) {
                console.error(`❌ 源代币余额不足: 当前余额 ${fromBalance.toString()}, 需要 ${amount}`);
                process.exit(1);
            }
            
            const tx = await contract.mergeValue(fromTokenId, toTokenId, amount);
            console.log(`📝 交易已提交: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log('✅ 合并成功!');
            console.log(`⛽ Gas使用量: ${receipt!.gasUsed.toString()}`);
            
            // 显示合并后状态
            const newFromBalance = await contract["balanceOf(uint256)"](fromTokenId);
            const newToBalance = await contract["balanceOf(uint256)"](toTokenId);
            console.log(`📊 合并后源代币余额: ${newFromBalance.toString()}`);
            console.log(`📊 合并后目标代币余额: ${newToBalance.toString()}`);
            
        } catch (error) {
            console.error('❌ 合并失败:', error);
            process.exit(1);
        }
    });

// 查询命令
program
    .command('info')
    .description('查询代币或合约信息')
    .option('-i, --tokenId <tokenId>', '代币ID')
    .option('-c, --contract', '显示合约信息')
    .action(async (options) => {
        try {
            const { contract, contractAddress } = await getContract();
            
            if (options.contract) {
                // 显示合约信息
                console.log('📋 合约信息:');
                console.log(`📍 地址: ${contractAddress}`);
                console.log(`📝 名称: ${await contract.name()}`);
                console.log(`🔤 符号: ${await contract.symbol()}`);
                console.log(`🔢 精度: ${await contract.valueDecimals()}`);
                console.log(`👤 所有者: ${await contract.owner()}`);
                
            } else if (options.tokenId) {
                // 显示代币信息
                const tokenId = parseInt(options.tokenId);
                
                try {
                    const balance = await contract["balanceOf(uint256)"](tokenId);
                    const slot = await contract.slotOf(tokenId);
                    const owner = await contract.ownerOf(tokenId);
                    
                    formatTokenInfo(tokenId, balance, slot, owner);
                    
                } catch (error) {
                    console.error(`❌ 代币 #${tokenId} 不存在或查询失败`);
                    process.exit(1);
                }
                
            } else {
                console.error('❌ 请指定 --tokenId 或 --contract 参数');
                process.exit(1);
            }
            
        } catch (error) {
            console.error('❌ 查询失败:', error);
            process.exit(1);
        }
    });

// 批量操作命令
program
    .command('batch-mint')
    .description('批量铸造代币')
    .requiredOption('-c, --count <count>', '铸造数量')
    .option('-t, --type <type>', '设备类型', '0')
    .option('-v, --value <value>', '每个代币价值', '100')
    .option('-r, --recipient <address>', '接收地址')
    .action(async (options) => {
        try {
            const { contract, signer } = await getContract();
            
            const count = parseInt(options.count);
            const deviceType = parseInt(options.type);
            const value = parseInt(options.value);
            const recipient = options.recipient || signer.address;
            
            console.log(`🏭 开始批量铸造 ${count} 个代币...`);
            console.log(`👤 接收地址: ${recipient}`);
            console.log(`🔧 设备类型: ${deviceType}`);
            console.log(`💰 每个代币价值: ${value}`);
            
            let totalGas = BigInt(0);
            const startTime = Date.now();
            
            for (let i = 0; i < count; i++) {
                const tx = await contract.mint(recipient, deviceType, value);
                const receipt = await tx.wait();
                totalGas += receipt!.gasUsed;
                
                if ((i + 1) % 10 === 0 || i === count - 1) {
                    console.log(`   ✅ 已铸造 ${i + 1}/${count} 个代币`);
                }
            }
            
            const endTime = Date.now();
            
            console.log('✅ 批量铸造完成!');
            console.log(`⏱️ 总耗时: ${endTime - startTime}ms`);
            console.log(`⛽ 总Gas消耗: ${totalGas.toString()}`);
            console.log(`📊 平均每个代币: ${(Number(totalGas) / count).toFixed(0)} Gas`);
            
        } catch (error) {
            console.error('❌ 批量铸造失败:', error);
            process.exit(1);
        }
    });

// 性能测试命令
program
    .command('benchmark')
    .description('运行性能基准测试')
    .option('-o, --operations <operations>', '测试操作数量', '10')
    .action(async (options) => {
        try {
            const { contract, signer } = await getContract();
            const operations = parseInt(options.operations);
            
            console.log(`🔬 开始性能基准测试 (${operations} 个操作)...`);
            
            // 准备测试数据
            console.log('📋 准备测试环境...');
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
            
            // 测试铸造性能
            console.log('🧪 测试铸造性能...');
            for (let i = 0; i < operations; i++) {
                const start = Date.now();
                const tx = await contract.mint(signer.address, i % 2, 100);
                const receipt = await tx.wait();
                const end = Date.now();
                
                results.mint.times.push(end - start);
                results.mint.gas.push(Number(receipt!.gasUsed));
            }
            
            // 测试分割性能
            console.log('🧪 测试分割性能...');
            for (let i = 0; i < Math.min(operations, 10); i++) {
                const start = Date.now();
                const tx = await contract.splitValue(1, 100, signer.address);
                const receipt = await tx.wait();
                const end = Date.now();
                
                results.split.times.push(end - start);
                results.split.gas.push(Number(receipt!.gasUsed));
            }
            
            // 生成报告
            console.log('📊 性能基准测试报告:');
            console.log('═══════════════════════════════════════');
            
            Object.entries(results).forEach(([operation, data]) => {
                if (data.times.length > 0) {
                    const avgTime = data.times.reduce((a, b) => a + b, 0) / data.times.length;
                    const avgGas = data.gas.reduce((a, b) => a + b, 0) / data.gas.length;
                    const minTime = Math.min(...data.times);
                    const maxTime = Math.max(...data.times);
                    
                    console.log(`${operation.toUpperCase()}操作:`);
                    console.log(`  平均时间: ${avgTime.toFixed(1)}ms`);
                    console.log(`  时间范围: ${minTime}ms - ${maxTime}ms`);
                    console.log(`  平均Gas: ${avgGas.toFixed(0)}`);
                    console.log(`  操作次数: ${data.times.length}`);
                    console.log('');
                }
            });
            
        } catch (error) {
            console.error('❌ 基准测试失败:', error);
            process.exit(1);
        }
    });

// 解析命令行参数并执行
program.parse();
