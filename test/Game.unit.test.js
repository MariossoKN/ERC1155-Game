const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper.hardhat.config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Game unit test", async function () {
          let deployer,
              vrfCoordinatorV2Mock,
              game,
              vrfCoordinatorAddress,
              gasLane,
              subId,
              requestConfirmations,
              callbackGasLimit
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["mocks", "game"])
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              game = await ethers.getContract("Game", deployer)
              //   gasLane = await game.getGasLane()
              //   subId = await game.getSubId()
              //   requestConfirmations = await game.getRequestConfirmations()
              //   callbackGasLimit = await game.getCallbackGasLimit()
          })
          describe("Constructor", function () {
              it("Initializes the constructor parameters correctly", async function () {})
          })
      })
