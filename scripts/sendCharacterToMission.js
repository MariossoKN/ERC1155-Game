// sends a character to mission
// update the player address with your address
// run with "yarn hardhat run scripts/sendCharacterToMission.js --network sepolia"

const { ethers } = require("hardhat")

async function sendCharacterToMission() {
    const game = await ethers.getContract("Game")
    const player = "0xA965Be285553aF1C1D22407d41129d6e1294cDD2"

    const weaponLevel = await game.getCharacterWeaponLevel(player)
    const tx = await game.sendCharacterToMission()
    await tx.wait(5)
    const timeLeft = await game.calculateMissionTimeLeft(player)

    console.log("--------------------------------------")
    console.log(`Character sent to a mission with weapon level: ${weaponLevel}.`)
    console.log(`The mission will take ${timeLeft} seconds to finish.`)
    console.log("--------------------------------------")
}

sendCharacterToMission()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
