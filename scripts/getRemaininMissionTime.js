// calculates the remaining mission time
// update the player address with your address
// run with "yarn hardhat run scripts/getRemaininMissionTime.js --network sepolia"

const { ethers } = require("hardhat")

async function getRemaininMissionTime() {
    const game = await ethers.getContract("Game")
    const player = "0xA965Be285553aF1C1D22407d41129d6e1294cDD2"

    const timeLeft = await game.calculateMissionTimeLeft(player)

    console.log("--------------------------------------")
    console.log(
        `Mission will end in ${timeLeft} seconds (${BigInt(timeLeft) / 60n} minutes or ~ ${
            BigInt(timeLeft) / 3600n
        } hours).`,
    )
    console.log("--------------------------------------")
}

getRemaininMissionTime()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
