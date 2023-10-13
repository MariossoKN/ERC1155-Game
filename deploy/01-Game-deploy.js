const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper.hardhat.config")
const { verify } = require("../utils/verify")

const FUND_AMOUNT = ethers.parseEther("1")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    let vrfCoordinatorV2Mock, subscriptionId, vrfCoordinatorAddress
    if (chainId == 31337) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorAddress = vrfCoordinatorV2Mock.target
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait()
        subscriptionId = BigInt(transactionReceipt.logs[0].topics[1])
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorAddress = networkConfig[chainId]["vrfCoordinatorAddress"]
        subscriptionId = networkConfig[chainId]["subId"]
    }

    const args = [
        vrfCoordinatorAddress,
        networkConfig[chainId]["gasLane"],
        subscriptionId,
        networkConfig[chainId]["requestConfirmations"],
        networkConfig[chainId]["callbackGasLimit"],
        networkConfig[chainId]["weaponUpgradePrice"],
        networkConfig[chainId]["legendaryFireSwordPrice"],
    ]
    const blockConfirmations = network.config.blockConfirmations

    const game = await deploy("Game", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: blockConfirmations,
    })

    // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2Mock contract.
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, game.address)
    }
    // Contract verification
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(game.address, args)
    }

    console.log(`VRFCoordinator address: ${vrfCoordinatorAddress}`)
    console.log(`Contract address: ${game.address}`)
    console.log("**********************************************************************")
    console.log("Please dont forget to add this contract to Chainlink VRF subscription.")
    console.log("**********************************************************************")
}
module.exports.tags = ["all", "game"]
