import { expect } from "chai";
import { ethers } from "hardhat";
import type { IoTSFT } from "../typechain-types"; // Adjust the import path if necessary
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";


describe("IoTSFT", function () {
    let iotSFT: IoTSFT;
    let owner: SignerWithAddress;
    let addr1: SignerWithAddress;
    let addr2: SignerWithAddress;

    // 在每 tests用例执行前部署合约
    beforeEach(async function () { 
    [owner, addr1, addr2] = await ethers.getSigners(); 
    const IoTSFTFactory = await ethers.getContractFactory("IoTSFT"); 
    // 补充构造函数参数：名称、符号和小数位数 
    iotSFT = await IoTSFTFactory.deploy("IoT SFT", "IOTSFT", 18); 
    await iotSFT.waitForDeployment(); 
    }); 


    // Test合约铸造功能
    it("Should mint a new token", async function () {
        const deviceType = 0; // TemperatureSensor
        const value = 100;
        await iotSFT.connect(owner).mint(addr1.address, deviceType, value);
        const tokenId = 1;
        expect(await iotSFT.ownerOf(tokenId)).to.equal(addr1.address);
        expect(await iotSFT["balanceOf(uint256)"](tokenId)).to.equal(value);
    });

    // Test非合约所有者尝试铸造应该失败
    it("Should fail if non-owner tries to mint", async function () {
        const deviceType = 1; // CrowdDensitySensor
        const value = 50;
        await expect(
            iotSFT.connect(addr1).mint(addr1.address, deviceType, value)
        ).to.be.rejectedWith("Ownable: caller is not the owner");
    });

    // Test value 分拆功能
    it("Should split value correctly", async function () {
        const deviceType = 0; // TemperatureSensor
        const initialValue = 100;
        const splitValue = 30;
        
        await iotSFT.connect(owner).mint(addr1.address, deviceType, initialValue);
        await iotSFT.connect(addr1).splitValue(1, splitValue, addr2.address);

        const tokenId = 1;
        expect(await iotSFT["balanceOf(uint256)"](tokenId)).to.equal(initialValue - splitValue);
        expect(await iotSFT["balanceOf(uint256)"](tokenId+1)).to.equal(splitValue);
    });

    // Test value 合并功能
    it("Should merge value correctly", async function () {
        const deviceType = 1; // CrowdDensitySensor
        const value1 = 50;
        const value2 = 30;
        const mergeValue = 20;

        await iotSFT.connect(owner).mint(addr1.address, deviceType, value1);
        await iotSFT.connect(owner).mint(addr1.address, deviceType, value2);
        await iotSFT.connect(addr1).mergeValue(1, 2, mergeValue);

        const tokenId = 1;
        expect(await iotSFT["balanceOf(uint256)"](tokenId)).to.equal(value1 - mergeValue);
        expect(await iotSFT["balanceOf(uint256)"](tokenId + 1)).to.equal(value2 + mergeValue);
    });
});