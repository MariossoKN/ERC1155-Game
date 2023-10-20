// upgrades weapon to next level (max upgrade is 3)
// update the player address with your address
// run with "yarn hardhat run scripts/upgradeWeaponLevel.js --network sepolia"

const { networkConfig } = require("../helper.hardhat.config")
const { network, ethers } = require("hardhat")

async function upgradeWeaponLevel() {
    const game = await ethers.getContract("Game")
    const player = "0xA965Be285553aF1C1D22407d41129d6e1294cDD2"
    const goldBalanceBefore = await game.balanceOf(player, 1)
    const chainId = network.config.chainId
    const upgradePrice = networkConfig[chainId]["weaponUpgradePrice"]

    if (goldBalanceBefore < upgradePrice) {
        console.log(
            `Not enough gold. You are ${
                BigInt(upgradePrice) - BigInt(goldBalanceBefore)
            } gold short.`,
        )
    } else {
        const weaponLevelBefore = await game.getCharacterWeaponLevel(player)
        const tx = await game.upgradeWeaponLevel()
        await tx.wait(3)

        const weaponLevelAfter = await game.getCharacterWeaponLevel(player)
        const goldBalanceAfter = await game.balanceOf(player, 1)

        console.log("--------------------------------------")
        console.log(`Weapon upgraded from level ${weaponLevelBefore} to level ${weaponLevelAfter}.`)
        console.log(`Your character still have ${goldBalanceAfter} amount of gold.`)
        console.log("--------------------------------------")
    }
}

upgradeWeaponLevel()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
