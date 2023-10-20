// get the amount of gold specified address owns
// update the player address with your address
// run with "yarn hardhat run scripts/getGoldBalance.js --network sepolia"

const { ethers } = require("hardhat")

async function getGoldBalance() {
    const game = await ethers.getContract("Game")
    const player = "0xA965Be285553aF1C1D22407d41129d6e1294cDD2"

    const goldBalance = await game.balanceOf(player, 1)

    console.log("--------------------------------------")
    console.log(`Address ${player} owns ${goldBalance} amount of gold.`)
    console.log("--------------------------------------")
}

getGoldBalance()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
