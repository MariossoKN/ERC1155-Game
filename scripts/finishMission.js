// sends a character to mission
// update the player address with your address
// run with "yarn hardhat run scripts/finishMission.js --network sepolia"

const { ethers } = require("hardhat")

async function finishMission() {
    const game = await ethers.getContract("Game")
    const player = "0xA965Be285553aF1C1D22407d41129d6e1294cDD2"

    const reqId = await game.getRequestIdByAddress()
    const randomNumber = await game.getRandomNumber(reqId)
    const gold = await game.calculateRewards(BigInt(randomNumber) % 100n)
    const tx = await game.finishMission()
    await tx.wait(3)

    console.log("--------------------------------------")
    console.log(`Mission finished with a reward of ${gold} gold!`)
    console.log("--------------------------------------")
}

finishMission()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
