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
// import got from 'got'
// const got = import('got')

// Load environment variables from .env file
dotenv.config()

const officialBscRpc = 'https://speedy-nodes-nyc.moralis.io/2135a930504b23f8145f5bdc/bsc/mainnet/archive'
// const officialBscRpc = 'wss://speedy-nodes-nyc.moralis.io/2135a930504b23f8145f5bdc/bsc/mainnet/archive/ws'
const contractDeploymentBlockHeight = 7580000
const pcsAddress = `0xAf1DB0c88a2Bd295F8EdCC8C73f9eB8BcEe6fA8a`
const efxAddress = `0xC51Ef828319b131B595b7ec4B28210eCf4d05aD0`

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
        // start: contractDeploymentBlockHeight, 
        end: 'latest',
        // rpc: officialBscRpc,
        // file: true,
        // pipe: false,
        // json: true,
        // csv: false,
        // html: false,
    })
    .describe('start', 'Start block number').alias('start', 's')
    .describe('end', 'End block number').alias('end', 'e')
    .describe('rpc', 'BSC RPC endpoint').alias('rpc', 'r').string('rpc')
    .describe('input', 'Input file <path>').alias('input', 'i').string('input')
    .describe('file', 'Save file to disk').alias('file', 'f').boolean('file')
    .describe('html', 'Create HTML report').alias('html', 'm').boolean('html')
    .describe('pipe', 'Pipe to stdout').alias('pipe', 'p').boolean('pipe')
    .describe('json', 'Output as json').alias('json', 'j').boolean('json')
    .describe('csv', 'Output as csv').alias('csv', 'c').boolean('csv')
    .describe('ckey', 'Contract key').alias('ckey', 'k').string('ckey')
    .describe('bscweb', 'BSC Web3 instance').alias('bscweb', 'w').string('bscweb')
    // .describe('github', 'Github action').alias('github', 'g').string('github')
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

    const covalentUrl = `https://api.covalenthq.com/v1/56/address/${pcsAddress}/transfers_v2/?quote-currency=USD&format=CSV&contract-address=${efxAddress}&page-size=1000000&ending-block=${argv.end}&starting-block=${argv.start}&key=${argv.ckey}`

    const { got } = await import('got')
    const response = await got(covalentUrl)
    
    if (argv.ckey) {
        console.log(`Fetching covalent data from ${covalentUrl}`);
        pp.parse(response.body, {
            header: true,                               // header of csv file will be used for the obj keys, instead of index
            delimiter: ',',                             // csv delimiter
            dynamicTyping: true,                        // transform values into their corresponding js types
            // step: (result) => console.log(result),   // callback function for each row

            // results are passed to the callback as an array of objects
            complete: async (results) => {
                console.log(`Parsing CSV complete: ${covalentUrl}, rows: ${results.data.length}`)

                // Build summary using csv from covalent with archive node.
                // console.log(results)
                const promiseList = await buildArchiveList(results.data)
                                            .catch(console.error)
                                            .finally(console.log('Finish Retrieving list.\nCreating Promiselist'))
                const list = await Promise.all(promiseList).catch(console.error)
                summary =  await buildArchiveSummary(list).catch(console.error)
                console.log(`Summary: ${JSON.stringify(summary, null, 2)}`)
            },
            error: (err, file) => console.log(`Parsing CSV error: ${err}`)
        })        
    }

    if (argv.input) {
        
        if(argv.input.includes('csv')){
            pp.parse(argv.input, {
                header: true,           // header of csv file will be used for the obj keys, instead of index
                delimiter: ',',         // csv delimiter
                dynamicTyping: true,    // transform values into their corresponding js types
                // step: (result) => console.log(result), // callback function for each row

                // results are passed to the callback as an array of objects
                complete: async (results) => {
                    console.log(`Parsing CSV complete: ${argv.input}, rows: ${results.data.length}`)
                    const data = results.data.filter((el) => el.block_height >= 11190564 && el.block_height <= 11963059)

                    // Build summary using csv from covalent with archive node.
                    const promiseList = await buildArchiveList(data)
                                                .catch(console.error)
                                                .finally(console.log('Finish Retrieving list.\nCreating Promiselist'))
                    const list = await Promise.all(promiseList).catch(console.error)
                    summary =  await buildArchiveSummary(list).catch(console.error)
                    console.log(`Summary: ${JSON.stringify(summary, null, 2)}`)
                },
                error: (err, file) => console.log(`Parsing CSV error: ${err}`)
            })
        }

    } 
    
    if (argv.bscweb){

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

    if (argv.html) {
        const summary = buildSummary(list)
        createHTML(summary)
    }

    if (argv.pipe) {
        console.clear()
        process.stdout.write(JSON.stringify(list, null, 2))
    } 

} catch (error) {
    console.error(error)
}
})()

