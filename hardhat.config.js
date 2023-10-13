require("@nomicfoundation/hardhat-chai-matchers")
require("@nomicfoundation/hardhat-toolbox")
require("hardhat-deploy")
require("hardhat-contract-sizer")
require("dotenv").config()

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

module.exports = {
    solidity: {
        compilers: [{ version: "0.8.19" }, { version: "0.4.19" }, { version: "0.6.12" }],
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1,
            // forking: {
            //     url: MAINNET_RPC_URL,
            // },
        },
        localhost: {
            chainId: 31337,
            blockConfirmations: "1",
        },
        sepolia: {
            chainId: 11155111,
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
            blockConfirmations: "6",
        },
    },
    gasReporter: {
        enabled: false, //REPORT_GAS,
        currency: "USD",
        // outputFile: "gas-report.txt",
        noColors: true,
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
    mocha: {
        timeout: 500000, // 500 seconds max for running tests
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
}
