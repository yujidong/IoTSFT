// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@solvprotocol/erc-3525/ERC3525.sol";
import "@solvprotocol/erc-3525/ERC3525Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract IoTSFT is ERC3525, Ownable {

    // Counter for generating unique tokenID
    uint256 private _tokenIdCounter;

    constructor(
        string memory name_, 
        string memory symbol_, 
        uint8 decimals_
    ) ERC3525(name_, symbol_, decimals_) {
        _tokenIdCounter = 1;
    }

    enum DeviceType {
        TemperatureSensor,      // 0
        CrowdDensitySensor,     // 1
        HumiditySensor,         // 2
        PressureSensor,         // 3
        MotionSensor,           // 4
        LightSensor,            // 5
        SoundSensor,            // 6
        AirQualitySensor,       // 7
        GPSTracker,             // 8
        Camera,                 // 9
        Actuator,               // 10
        Controller              // 11
    }

    // Device group mapping: map multiple device types to a few slots
    mapping(DeviceType => uint256) public deviceToSlot;

    // Initialize device groups
    function initializeDeviceGroups() external onlyOwner {
        // Sensor group (slot 0)
        deviceToSlot[DeviceType.TemperatureSensor] = 0;
        deviceToSlot[DeviceType.HumiditySensor] = 0;
        deviceToSlot[DeviceType.PressureSensor] = 0;
        deviceToSlot[DeviceType.LightSensor] = 0;
        deviceToSlot[DeviceType.SoundSensor] = 0;
        deviceToSlot[DeviceType.AirQualitySensor] = 0;
        
        // Location sensor group (slot 1)
        deviceToSlot[DeviceType.CrowdDensitySensor] = 1;
        deviceToSlot[DeviceType.MotionSensor] = 1;
        deviceToSlot[DeviceType.GPSTracker] = 1;
        deviceToSlot[DeviceType.Camera] = 1;
        
        // Actuator group (slot 2)
        deviceToSlot[DeviceType.Actuator] = 2;
        deviceToSlot[DeviceType.Controller] = 2;
    }

    function mint(address to, DeviceType deviceType, uint256 value) external onlyOwner {
        uint256 tokenId = _tokenIdCounter++; 
        uint256 slot = deviceToSlot[deviceType]; // Use grouped slot instead of direct device type
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

    // Merge helper functions
    
    // Get all tokens of user in specified slot
    function getTokensBySlot(address owner, uint256 slot) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tempTokens = new uint256[](balance);
        uint256 count = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            if (slotOf(tokenId) == slot) {
                tempTokens[count] = tokenId;
                count++;
            }
        }
        
        // Create return array of correct size
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempTokens[i];
        }
        
        return result;
    }
    
    // Get all slots of user and their token counts
    function getSlotDistribution(address owner) external view returns (uint256[] memory slots, uint256[] memory counts) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tempSlots = new uint256[](balance);
        uint256[] memory tempCounts = new uint256[](balance);
        uint256 uniqueSlots = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            uint256 slot = slotOf(tokenId);
            
            // Check if slot already exists
            bool found = false;
            for (uint256 j = 0; j < uniqueSlots; j++) {
                if (tempSlots[j] == slot) {
                    tempCounts[j]++;
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                tempSlots[uniqueSlots] = slot;
                tempCounts[uniqueSlots] = 1;
                uniqueSlots++;
            }
        }
        
        // Create return array of correct size
        slots = new uint256[](uniqueSlots);
        counts = new uint256[](uniqueSlots);
        for (uint256 i = 0; i < uniqueSlots; i++) {
            slots[i] = tempSlots[i];
            counts[i] = tempCounts[i];
        }
    }
    
    // Suggest optimal merge operation
    function suggestMerge(address owner) external view returns (
        uint256 fromTokenId, 
        uint256 toTokenId, 
        uint256 maxAmount,
        bool canMerge
    ) {
        uint256 balance = balanceOf(owner);
        if (balance < 2) {
            return (0, 0, 0, false);
        }
        
        // Find token pairs with same slot
        for (uint256 i = 0; i < balance; i++) {
            uint256 token1 = tokenOfOwnerByIndex(owner, i);
            uint256 slot1 = slotOf(token1);
            
            for (uint256 j = i + 1; j < balance; j++) {
                uint256 token2 = tokenOfOwnerByIndex(owner, j);
                uint256 slot2 = slotOf(token2);
                
                if (slot1 == slot2) {
                    uint256 balance1 = balanceOf(token1);
                    uint256 balance2 = balanceOf(token2);
                    
                    // Suggest transferring from smaller balance to larger balance
                    if (balance1 <= balance2) {
                        return (token1, token2, balance1, true);
                    } else {
                        return (token2, token1, balance2, true);
                    }
                }
            }
        }
        
        return (0, 0, 0, false);
    }

    // Batch merge all tokens of same slot to target token
    function mergeAllToTarget(uint256 targetTokenId) external {
        require(ownerOf(targetTokenId) == msg.sender, "Not token owner");
        uint256 targetSlot = slotOf(targetTokenId);
        
        uint256 balance = balanceOf(msg.sender);
        uint256[] memory tokensToMerge = new uint256[](balance);
        uint256 count = 0;
        
        // Find all tokens of same slot (except target token)
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(msg.sender, i);
            if (tokenId != targetTokenId && slotOf(tokenId) == targetSlot) {
                tokensToMerge[count] = tokenId;
                count++;
            }
        }
        
        // Execute batch merge
        for (uint256 i = 0; i < count; i++) {
            uint256 tokenBalance = balanceOf(tokensToMerge[i]);
            if (tokenBalance > 0) {
                _transferValue(tokensToMerge[i], targetTokenId, tokenBalance);
            }
        }
    }
    
    // Auto optimization: merge all tokens of same slot into one
    function optimizeSlot(uint256 slot) external {
        uint256 balance = balanceOf(msg.sender);
        uint256[] memory slotTokens = new uint256[](balance);
        uint256 count = 0;
        
        // Collect all tokens of same slot
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(msg.sender, i);
            if (slotOf(tokenId) == slot) {
                slotTokens[count] = tokenId;
                count++;
            }
        }
        
        if (count <= 1) {
            return; // No optimization needed
        }
        
        // Select first token as target, merge all other tokens
        uint256 targetToken = slotTokens[0];
        for (uint256 i = 1; i < count; i++) {
            uint256 tokenBalance = balanceOf(slotTokens[i]);
            if (tokenBalance > 0) {
                _transferValue(slotTokens[i], targetToken, tokenBalance);
            }
        }
    }

    // Performance testing version of optimizeSlot (bypasses business logic)
    function benchmarkOptimizeSlot(uint256 slot) external returns (uint256 tokensMerged) {
        uint256 balance = balanceOf(msg.sender);
        uint256[] memory slotTokens = new uint256[](balance);
        uint256 count = 0;
        
        // Collect all tokens of same slot
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(msg.sender, i);
            if (slotOf(tokenId) == slot) {
                slotTokens[count] = tokenId;
                count++;
            }
        }
        
        if (count <= 1) {
            return 0; // Return 0 tokens merged for tracking
        }
        
        // Select first token as target, merge all other tokens
        uint256 targetToken = slotTokens[0];
        for (uint256 i = 1; i < count; i++) {
            uint256 tokenBalance = balanceOf(slotTokens[i]);
            if (tokenBalance > 0) {
                _transferValue(slotTokens[i], targetToken, tokenBalance);
            }
        }
        
        return count - 1; // Return number of tokens that were merged
    }

    // ====== 📦 Smart Device Package Trading System ======
    
    struct DevicePackage {
        uint256 packageId;
        string packageName;
        DeviceType[] deviceTypes;
        uint256 totalValue;
        uint256 availableValue;
        bool isActive;
    }
    
    // Device package management
    mapping(uint256 => DevicePackage) public devicePackages;
    mapping(uint256 => uint256) public tokenToPackage; // tokenId => packageId
    uint256 private _packageIdCounter = 1;
    
    // Create device package (for bundled sales)
    function createDevicePackage(
        string memory packageName,
        DeviceType[] memory deviceTypes,
        uint256[] memory tokenIds,
        uint256[] memory amounts
    ) external returns (uint256 packageId) {
        require(deviceTypes.length == tokenIds.length, "Arrays length mismatch");
        require(tokenIds.length == amounts.length, "Arrays length mismatch");
        
        packageId = _packageIdCounter++;
        devicePackages[packageId] = DevicePackage({
            packageId: packageId,
            packageName: packageName,
            deviceTypes: deviceTypes,
            totalValue: 0,
            availableValue: 0,
            isActive: true
        });
        
        // Merge specified tokens into package
        uint256 packageSlot = _getPackageSlot(deviceTypes);
        uint256 packageTokenId = _tokenIdCounter++;
        uint256 totalPackageValue = 0;
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(ownerOf(tokenIds[i]) == msg.sender, "Not token owner");
            require(_isCompatibleDeviceType(slotOf(tokenIds[i]), packageSlot), "Incompatible device type");
            
            _transferValue(tokenIds[i], packageTokenId, amounts[i]);
            totalPackageValue += amounts[i];
        }
        
        if (totalPackageValue > 0) {
            _mint(msg.sender, packageTokenId, packageSlot, totalPackageValue);
            tokenToPackage[packageTokenId] = packageId;
            
            devicePackages[packageId].totalValue = totalPackageValue;
            devicePackages[packageId].availableValue = totalPackageValue;
        }
        
        return packageId;
    }
    
    // Partial purchase of device package (core partial bundled sales function)
    function purchasePartialPackage(
        uint256 packageTokenId,
        uint256 amount,
        address buyer
    ) external {
        require(ownerOf(packageTokenId) == msg.sender, "Not package owner");
        uint256 packageId = tokenToPackage[packageTokenId];
        require(devicePackages[packageId].isActive, "Package not active");
        require(devicePackages[packageId].availableValue >= amount, "Insufficient package value");
        
        // Create partial package for buyer
        uint256 newTokenId = _tokenIdCounter++;
        uint256 packageSlot = slotOf(packageTokenId);
        
        _transferValue(packageTokenId, newTokenId, amount);
        _mint(buyer, newTokenId, packageSlot, 0); // Mint first then transfer
        _transferValue(packageTokenId, newTokenId, amount);
        
        // Update package information
        devicePackages[packageId].availableValue -= amount;
        
        emit PartialPackageSold(packageId, newTokenId, amount, buyer);
    }
    
    // Smart merge suggestion (maintain device type compatibility)
    function suggestCompatibleMerge(address owner) external view returns (
        uint256 fromTokenId, 
        uint256 toTokenId, 
        uint256 maxAmount,
        bool canMerge,
        string memory deviceCategory
    ) {
        uint256 balance = balanceOf(owner);
        if (balance < 2) {
            return (0, 0, 0, false, "");
        }
        
        // Find functionally similar and mergeable device tokens
        for (uint256 i = 0; i < balance; i++) {
            uint256 token1 = tokenOfOwnerByIndex(owner, i);
            uint256 slot1 = slotOf(token1);
            
            for (uint256 j = i + 1; j < balance; j++) {
                uint256 token2 = tokenOfOwnerByIndex(owner, j);
                uint256 slot2 = slotOf(token2);
                
                if (slot1 == slot2) {
                    uint256 balance1 = balanceOf(token1);
                    uint256 balance2 = balanceOf(token2);
                    string memory category = _getDeviceCategoryName(slot1);
                    
                    if (balance1 <= balance2) {
                        return (token1, token2, balance1, true, category);
                    } else {
                        return (token2, token1, balance2, true, category);
                    }
                }
            }
        }
        
        return (0, 0, 0, false, "");
    }
    
    // Get device package information
    function getPackageInfo(uint256 packageId) external view returns (
        string memory packageName,
        DeviceType[] memory deviceTypes,
        uint256 totalValue,
        uint256 availableValue,
        uint256 utilizationRate // Utilization rate percentage
    ) {
        DevicePackage memory pkg = devicePackages[packageId];
        uint256 utilization = pkg.totalValue > 0 ? 
            ((pkg.totalValue - pkg.availableValue) * 100) / pkg.totalValue : 0;
            
        return (
            pkg.packageName,
            pkg.deviceTypes,
            pkg.totalValue,
            pkg.availableValue,
            utilization
        );
    }
    
    // Get all device packages of user
    function getUserPackages(address owner) external view returns (uint256[] memory packageIds) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tempPackages = new uint256[](balance);
        uint256 count = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            uint256 packageId = tokenToPackage[tokenId];
            
            if (packageId != 0) {
                // Check if already added
                bool found = false;
                for (uint256 j = 0; j < count; j++) {
                    if (tempPackages[j] == packageId) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    tempPackages[count] = packageId;
                    count++;
                }
            }
        }
        
        packageIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            packageIds[i] = tempPackages[i];
        }
    }
    
    // ====== Internal Helper Functions ======
    
    function _getPackageSlot(DeviceType[] memory deviceTypes) internal view returns (uint256) {
        if (deviceTypes.length == 0) return 0;
        
        // Use slot of first device type as package slot
        return deviceToSlot[deviceTypes[0]];
    }
    
    function _isCompatibleDeviceType(uint256 tokenSlot, uint256 packageSlot) internal pure returns (bool) {
        return tokenSlot == packageSlot;
    }
    
    function _getDeviceCategoryName(uint256 slot) internal pure returns (string memory) {
        if (slot == 0) return "Environmental Sensors";
        if (slot == 1) return "Location & Motion Sensors";
        if (slot == 2) return "Controllers & Actuators";
        return "Unknown Category";
    }
    
    // ====== Event Definitions ======
    
    event DevicePackageCreated(
        uint256 indexed packageId, 
        string packageName, 
        uint256 totalValue,
        address owner
    );
    
    event PartialPackageSold(
        uint256 indexed packageId,
        uint256 indexed newTokenId,
        uint256 amount,
        address buyer
    );
}