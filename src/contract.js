const fs = require('fs')
const path = require('path')
const Web3 = require('web3')
const cliProgress = require('cli-progress')
const {calculateFeeObject} = require('./calculate')

/**
 * Get events from BSC contract in batches
 * @param {number} head - starting block number
 * @param {number} tail - ending block number
 * @param {eventName} eventName - name of event to get {'allEvents', 'Swap', 'Sync', 'Transfer', 'Approval', 'Mint', 'Burn'}}
 * @returns {Promise} - promise that resolves to events array
 */
const getEvents = async (head, tail, eventName, contract) => {
    try {
        return await contract.getPastEvents(eventName, {
            fromBlock: head,
            toBlock: tail
        })
    } catch (error) {
        // 'Invalid JSON RPC response: "upstream request timeout"' || 'Invalid JSON RPC response: ""'
        if (error.message.includes('Invalid JSON RPC response')) {
            await getEvents(head, tail)
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
        format: ' 🥨 {bar} | {percentage}% | ETA: {eta_formatted} | Duration: {duration_formatted} | {value}/{total} Blocks | Swaps: {resultsLength} | Total Swaps: {swaps}',
    }, cliProgress.Presets.shades_classic)
    
    bar.start(delta, startValueBar, {
        resultsLength: "N/A",
        swaps: "N/A",
    })

    const updateBar = () => {
        bar.increment(blockRangeLimit)
        bar.update({
            resultsLength: results.length,
            swaps: swapEvents.length
        })
    }
    
    while (pointer <= tail) {
        results = await getEvents(previousPointer, pointer, eventName, pancakeContract)
        if (results) {
            if(results.length > 0) {
                results.forEach(event => swapEvents.push(event))
            }
            updateBar()
        }
        
        previousPointer = pointer
        pointer += blockRangeLimit

        if(pointer > tail) {
            pointer = tail
            const result = await getEvents(previousPointer, pointer, eventName, pancakeContract)
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
    getEvents
}