const networkConfig = {
    11155111: {
        name: "sepolia",
        vrfCoordinatorAddress: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        subId: "1754",
        requestConfirmations: "3",
        callbackGasLimit: "100000",
        weaponUpgradePrice: "5",
        legendaryFireSwordPrice: "5",
    },
    31337: {
        name: "hardhat",
        vrfCoordinatorAddress: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        subId: "1",
        requestConfirmations: "3",
        callbackGasLimit: "100000",
        weaponUpgradePrice: "5",
        legendaryFireSwordPrice: "5",
    },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = { networkConfig, developmentChains }
