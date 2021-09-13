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
            
            fs.readFile(path.join(__dirname, argv.input), async function (err,data) {
                let input = data.toString();
                var lines = input.split("\n");
                var result = [];
                var headers;
                headers = lines[0].split(",");
                let filteredHeaders = []
                
                for (var i = 0; i < headers.length; i++) {
                    filteredHeaders.push(headers[i].replace(/\r?\n|\r/g, ""));
                }
        
                for (var i = 1; i < lines.length; i++) {
                    var obj = {};
        
                    if(lines[i] == undefined || lines[i].trim() == "") {
                        continue;
                    }
        
                    var words = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                    for(var j = 0; j < words.length; j++) {
                        words[j] = words[j].replace(/\r?\n|\r/g, "");
                        obj[filteredHeaders[j].trim().replace(/['"]+/g, '')] = words[j].replace(/['"]+/g, '');
                    }
                    result.push(obj);
                }
                result = result.filter(function (el) {
                    return parseInt(el.block_height) >= 9601569 &&
                           parseInt(el.block_height) <= 10789440;
                  });
                console.log(result);
                  // list = await buildList(input)
                // summary = buildSummary(list)
            });

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
