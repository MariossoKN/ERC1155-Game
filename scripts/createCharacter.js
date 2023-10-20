// creates a character
// run with "yarn hardhat run scripts/createCharacter.js --network sepolia"

const { ethers } = require("hardhat")

async function createCharacter() {
    const game = await ethers.getContract("Game")

    await game.createCharacter()
    console.log("--------------------------------------")
    console.log(`Character created.`)
    console.log("--------------------------------------")
}

createCharacter()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
