const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper.hardhat.config")
const { time } = require("@nomicfoundation/hardhat-network-helpers")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Game unit test", async function () {
          let deployer, vrfCoordinatorV2Mock, game, player, chainId
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["mocks", "game"])
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              game = await ethers.getContract("Game", deployer)
              const accounts = await ethers.getSigners()
              owner = accounts[0]
              player = accounts[1]
              chainId = network.config.chainId
          })
          describe("Constructor", function () {
              it("Initializes the constructor parameters correctly", async function () {
                  assert.equal(await game.getVrfCoordinatorAddress(), vrfCoordinatorV2Mock.target)
                  assert.equal(await game.getGasLane(), networkConfig[chainId]["gasLane"])
                  assert.equal(await game.getSubId(), networkConfig[chainId]["subId"])
                  assert.equal(
                      await game.getRequestConfirmations(),
                      networkConfig[chainId]["requestConfirmations"],
                  )
                  assert.equal(
                      await game.getCallbackGasLimit(),
                      networkConfig[chainId]["callbackGasLimit"],
                  )
                  assert.equal(
                      await game.getWeaponUpgradePrice(),
                      networkConfig[chainId]["weaponUpgradePrice"],
                  )
                  assert.equal(
                      await game.getLegendaryFireSwordPrice(),
                      networkConfig[chainId]["legendaryFireSwordPrice"],
                  )
              })
          })
          describe("Function: createCharacter", function () {
              it("Should revert if character was already created for this address", async function () {
                  await game.connect(player).createCharacter()
                  //   await game.connect(player).createCharacter()
                  await expect(game.connect(player).createCharacter()).to.be.reverted
              })
              it("Should create a character with weapon lvl, gold and wooden sword", async function () {
                  await game.connect(player).createCharacter()
                  //   assert.equal(
                  //       await game.balanceOfBatch(
                  //           [player.address, player.address, player.address],
                  //           [0, 1, 2],
                  //       ),
                  //       [BigInt(1), BigInt(50), BigInt(1)],
                  //   )
                  assert.equal(await game.balanceOf(player.address, "0"), "1")
                  assert.equal(await game.balanceOf(player.address, "1"), "50")
                  assert.equal(await game.balanceOf(player.address, "2"), "1")
              })
          })
          describe("Function: upgradeWeaponLevel", function () {
              it("Should revert if caller doesnt own a character", async function () {
                  // await game.connect(player).upgradeWeaponLevel()
                  await expect(game.connect(player).upgradeWeaponLevel()).to.be.reverted
              })
              it("Should revert if callers weapon is max level (3)", async function () {
                  await game.connect(player).createCharacter()
                  assert.equal(await game.getCharacterWeaponLevel(player.address), "1")
                  await game.connect(player).upgradeWeaponLevel()
                  assert.equal(await game.getCharacterWeaponLevel(player.address), "2")
                  await game.connect(player).upgradeWeaponLevel()
                  assert.equal(await game.getCharacterWeaponLevel(player.address), "3")
                  // await game.connect(player).upgradeWeaponLevel()
                  await expect(game.connect(player).upgradeWeaponLevel()).to.be.reverted
              })
              it("Should revert if caller doenst have enough gold", async function () {
                  await game.connect(player).createCharacter()
                  await game.connect(player).burn(player.address, "1", "45")
                  await game.connect(player).upgradeWeaponLevel()
                  //   await game.connect(player).upgradeWeaponLevel()
                  await expect(game.connect(player).upgradeWeaponLevel()).to.be.reverted
              })
              it("Should upgrade the weapon level, mint a new weapon andburn the previous weapon", async function () {
                  await game.connect(player).createCharacter()
                  // weapon level should be 1 and we should own a wooden sword
                  assert.equal(await game.getCharacterWeaponLevel(player.address), "1")
                  assert.equal(await game.balanceOf(player.address, "3"), "0")
                  // upgrade the weapon
                  await game.connect(player).upgradeWeaponLevel()
                  // weapon level should be 2, we should own a steel sword and we should not own wooden sword
                  assert.equal(await game.getCharacterWeaponLevel(player.address), "2")
                  assert.equal(await game.balanceOf(player.address, "3"), "1")
                  assert.equal(await game.balanceOf(player.address, "2"), "0")
                  // upgrade the weapon
                  await game.connect(player).upgradeWeaponLevel()
                  // weapon level should be 3, we should own a magic sword and we should not own steel sword
                  assert.equal(await game.getCharacterWeaponLevel(player.address), "3")
                  assert.equal(await game.balanceOf(player.address, "4"), "1")
                  assert.equal(await game.balanceOf(player.address, "3"), "0")
              })
          })
          describe("Function: enchantMagicWeaponToFireWeapon", function () {
              it("Should revert if caller doesnt have enough gold", async function () {
                  await game.connect(player).createCharacter()
                  await game.connect(player).upgradeWeaponLevel()
                  await game.connect(player).upgradeWeaponLevel()
                  await game.connect(player).burn(player.address, "1", "40")
                  //   await game.connect(player).enchantMagicWeaponToFireWeapon()
                  await expect(game.connect(player).enchantMagicWeaponToFireWeapon()).to.be.reverted
              })
              it("Should revert if caller doesnt own a magic sword (weapon lvl 3)", async function () {
                  await game.connect(player).createCharacter()
                  //   await game.connect(player).enchantMagicWeaponToFireWeapon()
                  await expect(game.connect(player).enchantMagicWeaponToFireWeapon()).to.be.reverted
                  // upgrade to lvl 2
                  await game.connect(player).upgradeWeaponLevel()
                  //   await game.connect(player).enchantMagicWeaponToFireWeapon()
                  await expect(game.connect(player).enchantMagicWeaponToFireWeapon()).to.be.reverted
                  // upgrade to lvl 3
                  await game.connect(player).upgradeWeaponLevel()
                  await game.connect(player).enchantMagicWeaponToFireWeapon()
              })
          })
          describe("Function: sendCharacterToMission", function () {
              it("Should revert if caller doesnt own a character", async function () {
                  //   await game.connect(player).sendCharacterToMission()
                  await expect(game.connect(player).sendCharacterToMission()).to.be.reverted
              })
              it("Should revert if character is on the mission already", async function () {
                  await game.connect(player).createCharacter()
                  await game.connect(player).sendCharacterToMission()
                  //   await game.connect(player).sendCharacterToMission()
                  await expect(game.connect(player).sendCharacterToMission()).to.be.reverted
              })
              it(`Should change the status of the character to "on mission" and save the timestamp`, async function () {
                  await game.connect(player).createCharacter()
                  assert.equal(await game.getCharacterMissionStatus(player.address), false)
                  assert.equal(await game.getCharacterMissionStart(player.address), "0")
                  await game.connect(player).sendCharacterToMission()
                  assert.equal(await game.getCharacterMissionStatus(player.address), true)
                  const block = await ethers.provider.getBlock("latest")
                  const blockTimestamp = block.timestamp
                  assert.equal(await game.getCharacterMissionStart(player.address), blockTimestamp)
              })
              it(`Should update the VRF request status`, async function () {
                  await game.connect(player).createCharacter()
                  await new Promise(async (resolve, reject) => {
                      game.once("CharacterCreated", async () => {
                          try {
                              const requestMapping = await game.getRequestMapping("1")
                              const requestExists = requestMapping[1]
                              // check if requestId exists
                              assert.equal(requestExists, true)
                              assert.equal(await game.getLatestRequestId(), "1")
                              //   assert.equal(await game.getRequestIds(), [1n])
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          const requestResponse = await game
                              .connect(player)
                              .sendCharacterToMission()
                          console.log(`Sending character to mission...`)
                          const requestNftReceipt = await requestResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.logs[0].topics[2],
                              game.target,
                          )
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })
          describe("Function: finishMission", function () {
              it("Should revert if not enough time passed #1", async function () {
                  await game.connect(player).createCharacter()
                  await game.connect(player).sendCharacterToMission()
                  await expect(game.connect(player).finishMission()).to.be.reverted
              })
              it("Should revert if not enough time passed #2", async function () {
                  await game.connect(player).createCharacter()
                  await game.connect(player).sendCharacterToMission()
                  // increasing the time
                  await network.provider.send("evm_increaseTime", [15000])
                  await network.provider.send("evm_mine", [])
                  await expect(game.connect(player).finishMission()).to.be.reverted
              })
              it("Should revert if random number was not generated by the VRF", async function () {
                  await game.connect(player).createCharacter()
                  await game.connect(player).sendCharacterToMission()
                  // increasing the time
                  await network.provider.send("evm_increaseTime", [28000])
                  await network.provider.send("evm_mine", [])
                  //   await game.connect(player).finishMission()
                  await expect(game.connect(player).finishMission()).to.be.reverted
              })
              it("Should change the status on mission to false and mint gold according to the random number", async function () {
                  let balanceOfGoldBefore, balanceOfGoldAfter
                  await game.connect(player).createCharacter()
                  balanceOfGoldBefore = await game.balanceOf(player, 1)
                  await new Promise(async (resolve, reject) => {
                      game.once("RequestFulfilled", async () => {
                          try {
                              const requestId = await game.getLatestRequestId()
                              console.log("Finishing mission...")
                              await game.connect(player).finishMission()
                              balanceOfGoldAfter = await game.balanceOf(player, 1)
                              const randomNumber = await game.getRandomNumber(requestId)
                              const calculatedReward = await game.calculateRewards(randomNumber)
                              assert.equal(balanceOfGoldAfter, BigInt(calculatedReward) + 50n)
                              assert.equal(
                                  await game.getCharacterMissionStatus(player.address),
                                  false,
                              )
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          console.log(`Sending character to mission...`)
                          const requestResponse = await game
                              .connect(player)
                              .sendCharacterToMission()
                          assert.equal(await game.getCharacterMissionStatus(player.address), true)
                          const requestNftReceipt = await requestResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.logs[0].topics[2],
                              game.target,
                          )
                          // increasing the time
                          console.log("Increasing time...")
                          await network.provider.send("evm_increaseTime", [28000])
                          await network.provider.send("evm_mine", [])
                          console.log("Waiting for the RequestFulfilled event to get fired...")
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })
          describe("Function: calculateMissionTimeLeft", function () {
              it("Should calculate how much time is left from mission", async function () {
                  const timeIncrease = 25000
                  await game.connect(player).createCharacter()
                  await game.connect(player).sendCharacterToMission()
                  // increasing the time
                  await network.provider.send("evm_increaseTime", [timeIncrease])
                  await network.provider.send("evm_mine", [])
                  // calculate the time passed
                  const missionStart = await game
                      .connect(player)
                      .getCharacterMissionStart(player.address)
                  const block = await ethers.provider.getBlock("latest")
                  const blockTimestamp = block.timestamp
                  const timePassed = BigInt(blockTimestamp) - BigInt(missionStart)
                  // calculate the mission duration (according to the weapon lvl)
                  const missionTimeInSeconds = await game.connect(player).getMissionTimeInSeconds()
                  const weaponLevel = await game
                      .connect(player)
                      .getCharacterWeaponLevel(player.address)
                  const missionDuration = BigInt(missionTimeInSeconds) - BigInt(weaponLevel * 3600n)
                  // calculate time left
                  const timeLeft = missionDuration - timePassed
                  const timeLeftFromFunction = await game.calculateMissionTimeLeft(player.address)
                  assert.equal(timeLeft, timeLeftFromFunction)
              })
          })
          describe("Function: calculateRewards", function () {
              it("Should calculate gold rewards according to the random number", async function () {
                  const calculatedNumber1 = await game.calculateRewards("88")
                  assert.equal(calculatedNumber1, "20")
                  const calculatedNumber2 = await game.calculateRewards("55")
                  assert.equal(calculatedNumber2, "30")
                  const calculatedNumber3 = await game.calculateRewards("29")
                  assert.equal(calculatedNumber3, "40")
                  const calculatedNumber4 = await game.calculateRewards("9")
                  assert.equal(calculatedNumber4, "60")
                  const calculatedNumber5 =
                      await game.calculateRewards(
                          78541660797044910968829902406342334108369226379826116161446442989268089806461n,
                      )
                  assert.equal(calculatedNumber5, "20")
              })
          })
      })
