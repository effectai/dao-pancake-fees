const fs = require('fs')
const path = require('path')
const Web3 = require('web3')
const yargs = require('yargs')
const { green } = require('chalk')
const { hideBin } = require('yargs/helpers')
const { buildList, buildSummary } = require('./src/calculate')
const { writeToDisk, createHTML } = require('./src/util')
const { allEvents } = require('./src/contract')
const dotenv = require('dotenv')
const papaparse = require('papaparse')

// Load environment variables from .env file
dotenv.config()

const officialBscRpc = 'https://bsc-dataseed.binance.org/'
const contractDeploymentBlockHeight = 7580000

const welcomeMessage = `\
 _____  __  __           _     _   _      _                      _
| ____|/ _|/ _| ___  ___| |_  | \\ | | ___| |___      _____  _ __| | __
|  _| | |_| |_ / _ \\/ __| __| |  \\| |/ _ \\ __\\ \\ /\\ / / _ \\| '__| |/ /
| |___|  _|  _|  __/ (__| |_  | |\\  |  __/ |_ \\ V  V / (_) | |  |   < 
|_____|_| |_|  \\___|\\___|\\__| |_| \\_|\\___|\\__| \\_/\\_/ \\___/|_|  |_|\\_\\ ✨✨✨

Effect Network: Pancake Liquidity Pool Fee Calculator 💸💸💸
${green('Usage: $0 [options]')}
`

const argv = yargs(hideBin(process.argv))
    .usage(welcomeMessage)
    .default({
        start: contractDeploymentBlockHeight, 
        end: 'latest',
        rpc: officialBscRpc,
        file: true,
        // pipe: false,
        json: true,
        // csv: false
    })
    .describe('start', 'Start block number').alias('start', 's')
    .describe('end', 'End block number').alias('end', 'e')
    .describe('rpc', 'BSC RPC endpoint').alias('rpc', 'r')
    .describe('input', 'Input file <path>').alias('input', 'i')
    .describe('file', 'Save file to disk').alias('file', 'f').boolean('file')
    .describe('html', 'Create HTML report').alias('html', 'm').boolean('html')
    .describe('pipe', 'Pipe to stdout').alias('pipe', 'p').boolean('pipe')
    .describe('json', 'Output as json').alias('json', 'j').boolean('json')
    .describe('csv', 'Output as csv').alias('csv', 'c').boolean('csv')
    .describe('help', 'Print this help message').alias('help', 'h')
    // .conflicts('json', 'csv')
    // .conflicts('pipe', 'file')
    .alias('v', 'version')
    .help('h')
    .alias('h', 'help')
    .epilog(` 🌴`)
    .argv;

(async () => {    
    try {
    
        if (argv.input) {
            const input = JSON.parse(fs.readFileSync(path.join(__dirname, argv.input), 'utf8'))
            const list = buildList(input)
            if (argv.file) {
                writeToDisk('calculated_fee_swaps', argv, list)
            }
            const summary = buildSummary(list)
            console.log(summary)
            return
        } else {       
            const bscWeb3 = new Web3(process.env.BSC_RPC || argv.rpc)
            const latestBlockHeight = (await bscWeb3.eth.getBlock('latest')).number
            const startBlock = argv.start
            const endBlock = argv.end == 'latest' ? latestBlockHeight : argv.end

            // Only 'Swap' events are relevant for now.
            const result = await allEvents(startBlock, endBlock, 'Swap', bscWeb3)
            fs.writeFileSync(path.join(__dirname, `/data/raw_rpc_swap_data_${Date.now()}.json`), JSON.stringify(result, null, 2))

            const list = buildList(result)
            const file = argv.csv ? papaparse.unparse(list) : list

            if (argv.file) {
                writeToDisk('calculated_fee_swaps', argv, file)
            }

            if (argv.html) {
                const summary = buildSummary(list)
                createHTML(summary)
            }

            if (argv.pipe) {
                console.clear()
                process.stdout.write(JSON.stringify(list, null, 2))
            } else {
                // console.log(`${JSON.stringify(buildSummary(list), null, 2)}`)
                console.log(buildSummary(list))
            }
        }

    } catch (error) {
        console.error(error)
    }
})()
