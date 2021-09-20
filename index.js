const fs = require('fs')
const path = require('path')
const Web3 = require('web3')
const yargs = require('yargs')
const { green } = require('chalk')
const { hideBin } = require('yargs/helpers')
const { buildList, buildSummary, feeObject, buildArchiveList, archiveFeeObject, buildArchiveSummary} = require('./src/calculate')
const { writeToDisk, createHTML } = require('./src/util')
const { allEvents } = require('./src/contract')
const dotenv = require('dotenv')
const pp = require('papaparse')

// Load environment variables from .env file
dotenv.config()

const officialBscRpc = 'https://speedy-nodes-nyc.moralis.io/89694b76348bf1a5042c306d/bsc/mainnet/archive'
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
        // csv: false,
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
    // .conflicts('json', 'csv')
    // .conflicts('pipe', 'file')
    .alias('v', 'version')
    .help('h')
    .alias('h', 'help')
    .epilog(` 🌴`)
    .argv;

(async () => {    
    try {

        let list, summary
    
        if (argv.input) {
            
            if(argv.input.includes('csv')){
                console.log(`Reading CSV file: ${argv.input}`)
                const csvFile = fs.readFileSync(path.join(__dirname, argv.input), 'utf8')
                pp.parse(csvFile, {
                    header: true,           // header of csv file will be used for the obj keys, instead of index
                    delimiter: ',',         // csv delimiter
                    dynamicTyping: true,    // transform values into their corresponding js types

                    // results are passed to the callback as an array of objects
                    complete: async (results) => {
                        console.log(`Parsing CSV complete: ${argv.input}, rows: ${results.data.length}`)
                        const data = results.data.filter((el) => el.block_height >= 9601569 && el.block_height <= 10789440)

                        // Build summary using old method
                        // const list = await Promise.all(await buildList(data))
                        // summary = buildSummary(list)

                        // Build summary using csv from covalent with archive node.
                        const list = await Promise.all(buildCovalentList(data).catch(console.error))
                        summary = await buildArchiveList(list)
                    },
                    error: (err, file) => console.log(`Parsing CSV error: ${err}`)
                })
            }

        } else {

            const bscWeb3 = new Web3(process.env.BSC_RPC || argv.rpc)
            const latestBlockHeight = (await bscWeb3.eth.getBlock('latest')).number
            const startBlock = argv.start
            const endBlock = argv.end == 'latest' ? latestBlockHeight : argv.end

            // Only 'Swap' events are relevant for now.
            const result = await allEvents(startBlock, endBlock, 'Swap', bscWeb3)
            fs.writeFileSync(path.join(__dirname, `/data/raw_rpc_swap_data_${Date.now()}.json`), JSON.stringify(result, null, 2))

            list = await buildList(result)
        }

        if (argv.file) {
            writeToDisk('calculated_fee_swaps', argv, list)
        }

        // if (argv.html) {
        //     const summary = buildSummary(list)
        //     createHTML(summary)
        // }

        if (argv.pipe) {
            console.clear()
            process.stdout.write(JSON.stringify(list, null, 2))
        } else {
            // console.log(`${JSON.stringify(buildSummary(list), null, 2)}`)
            //console.log(buildSummary(list))
        }

    } catch (error) {
        console.error(error)
    }
})()

