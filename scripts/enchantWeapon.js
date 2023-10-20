// enchants weapon to max level 4 (must have a fully upgraded weapon lvl 3)
// update the player address with your address
// run with "yarn hardhat run scripts/enchantWeapon.js --network sepolia"

const { network, ethers } = require("hardhat")
const { networkConfig } = require("../helper.hardhat.config")

async function enchantWeapon() {
    const game = await ethers.getContract("Game")
    const player = "0xA965Be285553aF1C1D22407d41129d6e1294cDD2"
    const goldBalance = await game.balanceOf(player, 1)
    const chainId = network.config.chainId
    const enchantPrice = networkConfig[chainId]["legendaryFireSwordPrice"]

    if (goldBalance < enchantPrice) {
        console.log(
            `Not enough gold. You are ${BigInt(enchantPrice) - BigInt(goldBalance)} gold short.`,
        )
    } else {
        const weaponLevelBefore = await game.getCharacterWeaponLevel(player)
        const tx = await game.enchantMagicWeaponToFireWeapon()
        await tx.wait(3)
        const weaponLevelAfter = await game.getCharacterWeaponLevel(player)

        console.log("--------------------------------------")
        console.log(
            `Weapon enchanted from level ${weaponLevelBefore} to max level ${weaponLevelAfter}!`,
        )
        console.log("--------------------------------------")
    }
}

enchantWeapon()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
