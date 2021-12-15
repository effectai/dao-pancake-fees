const fs = require('fs')
const path = require('path')
const Web3 = require('web3')
const cliProgress = require('cli-progress')
const BN = (value) => new Web3.utils.BN(value)
const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const pThrottle = require('p-throttle')
const throttle = pThrottle({interval: 1000, limit: 15})

const FOUNDATION_BSC_ADDRESS = '0xb57a461681e57aa9f6bcb3f41f68cf270466dcae'
const PANCAKESWAP_EFX_ADDRESS = '0xAf1DB0c88a2Bd295F8EdCC8C73f9eB8BcEe6fA8a'
const pancakeswapAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../abi/pancake_efx_abi.json'), 'utf8'))

// const officialBscRpc = 'https://bsc.getblock.io/mainnet/?api_key=d01ef09a-076c-4138-b061-8058326f21ba'
const officialBscRpc = 'https://speedy-nodes-nyc.moralis.io/2135a930504b23f8145f5bdc/bsc/mainnet/archive'
const bscWeb3 = new Web3(officialBscRpc)
const pcsContract = new bscWeb3.eth.Contract(pancakeswapAbi, PANCAKESWAP_EFX_ADDRESS)

/**
 * Get block
 */
const getBlock = async (blockNumber) => {
    const block = await bscWeb3.eth.getBlock(blockNumber).catch(console.error)
    const milliseconds = block.timestamp * 1000
    const date = new Date(milliseconds)
    return date.toUTCString()
}

/**
 * Get totalsupply, with built in redundancy, uses contract.js web instance
 * @param {transaction} blockheight - transaction object
 * @returns {Promise} - promise that resolves to BN(totalSupply)
 */
const getTotalSupply = throttle(async (blockheight) => {
    try {
        // timeout(200)
        return total = await pcsContract.methods.totalSupply().call({}, blockheight)
    } catch (error) {
        if(error.message.includes('JSON')){
            console.log(`Trying again: ${error.message}`)
            await getTotalSupply(blockheight)
        } else {
            console.error(error)
        }
    }
})

/**
 * Get balance of the foundation, with built in redundancy
 * @param {transaction} blockheight - transaction object
 * @returns {Promise} - promise that resolves to BN(balance)
 */
const getFoundationBalance = throttle(async (blockheight) => {
    try {
        // timeout(200)
        return balance = await pcsContract.methods.balanceOf(FOUNDATION_BSC_ADDRESS).call({}, blockheight)
    } catch (error) {
        if(error.message.includes('JSON')) {
            console.log(`Trying again: ${error.message}`)
            await getFoundationBalance(blockheight)
        } else {
            console.error(error)
        }
    }
})

/**
 * Get events from BSC contract in batches
 * @param {number} head - starting block number
 * @param {number} tail - ending block number
 * @param {eventName} eventName - name of event to get {'allEvents', 'Swap', 'Sync', 'Transfer', 'Approval', 'Mint', 'Burn'}}
 * @param {contract} contract - web3 contract object
 * @param {cliProgress} bar - progress bar object
 * @returns {Promise} - promise that resolves to events array
 */
const getEvents = async (head, tail, eventName, contract, bar) => {
    try {
        return await contract.getPastEvents(eventName, {
            fromBlock: head,
            toBlock: tail
        })
    } catch (error) {
        // 'Invalid JSON RPC response: "upstream request timeout"' || 'Invalid JSON RPC response: ""'
        if (error.message.includes('Invalid JSON RPC response')) {
            // console.log(error.message)
            bar.update({error: `${error.message} @ block: ${head}`})
            await getEvents(head, tail, eventName, contract, bar)
        } else {
            console.error(error)
        }
    }
}    

/**
 * Retrieve all events for the panacake swap liquidity pool.
 * @param {number} head - starting block number
 * @param {number} tail - ending block number
 * @param {eventName} eventName - name of event to get {'allEvents', 'Swap', 'Sync', 'Transfer', 'Approval', 'Mint', 'Burn'}}
 * @param {bsc} The web3 provider
 * @returns {Promise} - promise that resolves to events array
 * @example getEvents(0, 100, 'allEvents', bsc)
 */
const allEvents = async (head, tail, eventName, bsc) => {
    // PancakeSwap Contract
    const PANCAKESWAP_EFX_ADDRESS = '0xAf1DB0c88a2Bd295F8EdCC8C73f9eB8BcEe6fA8a'
    const pancakeswapAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../abi/pancake_efx_abi.json'), 'utf8'))
    const pancakeContract = new bsc.eth.Contract(pancakeswapAbi, PANCAKESWAP_EFX_ADDRESS)

    const blockRangeLimit = 5000
    const delta = tail - head
    const startValueBar = 0
    
    let results
    let swapEvents = []
    let pointer = head + blockRangeLimit
    let previousPointer = head
    
    const bar = new cliProgress.SingleBar({
        format: ' 🥨 {bar} | {percentage}% | ETA: {eta_formatted} | Duration: {duration_formatted} | {value}/{total} Blocks | totalSwaps: {swaps} | lastError: {error}',
    }, cliProgress.Presets.shades_classic)
    
    bar.start(delta, startValueBar, {
        swaps: "N/A",
        error: "N/A",
    })

    const updateBar = () => {
        bar.increment(blockRangeLimit)
        bar.update({ swaps: swapEvents.length })
    }
    
    while (pointer <= tail) {
        results = await getEvents(previousPointer, pointer, eventName, pancakeContract, bar)
        if (results) {
            if(results.length > 0) {
                results.forEach(event => swapEvents.push(event))
            }
            updateBar()
        }
        console.log('getEvents length', results.length)
        
        previousPointer = pointer
        pointer += blockRangeLimit

        if(pointer > tail) {
            pointer = tail
            const result = await getEvents(previousPointer, pointer, eventName, pancakeContract, bar)
            if(result) {
                if(result.length > 0) {
                    result.forEach(event => swapEvents.push(event))
                }
            }
            updateBar()
            break
        } 
    }
    bar.stop()
    // bar.clear()
    return swapEvents
}

module.exports = {
    allEvents,
    getEvents,
    getTotalSupply,
    getFoundationBalance,
    getBlockDatetime
}