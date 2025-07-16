// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@solvprotocol/erc-3525/ERC3525.sol";
import "@solvprotocol/erc-3525/ERC3525Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract IoTSFT is ERC3525, Ownable {

    // 用于生成唯一tokenID的计数器
    uint256 private _tokenIdCounter;

    constructor(
        string memory name_, 
        string memory symbol_, 
        uint8 decimals_
    ) ERC3525(name_, symbol_, decimals_) {
        _tokenIdCounter = 1;
    }

    enum DeviceType {
        TemperatureSensor,
        CrowdDensitySensor
    }

    function mint(address to, DeviceType deviceType, uint256 value) external onlyOwner {
        uint256 tokenId = _tokenIdCounter++; 
        uint256 slot = uint256(deviceType); 
        _mint(to, tokenId, slot, value);
    }

    function splitValue(uint256 tokenId, uint256 amount, address to) external {
        require(balanceOf(tokenId) >= amount, "Insufficient value");
        _burnValue(tokenId, amount);
        uint256 slot = slotOf(tokenId);
        uint256 newTokenId = _tokenIdCounter++;
        _mint(to, newTokenId, slot, amount);
    }

    function mergeValue(uint256 fromTokenId, uint256 toTokenId, uint256 amount) external {
        require(ownerOf(fromTokenId) == msg.sender, "Not token owner");
        require(slotOf(fromTokenId) == slotOf(toTokenId), "Different slots");
        _transferValue(fromTokenId, toTokenId, amount);
    }

}