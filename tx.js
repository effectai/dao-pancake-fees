const fs = require('fs')
const path = require('path')
const Web3 = require('web3')
const BN = Web3.utils.BN

// const bscRpcEndpoint = 'https://bsc-dataseed.binance.org/' // common node
// const bscRpcEndpoint = 'https://wandering-small-waterfall.bsc.quiknode.pro/f925c94396088afa84b4eea736be8b843a595f6c/' // Quiknode
// const bscRpcEndpoint = 'https://bsc-mainnet.web3api.com/v1/JCWFHU73SVB31C5XUU5Y5QTYH2MTRXCE43' // web3Api
const bscRpcEndpoint = 'https://speedy-nodes-nyc.moralis.io/2135a930504b23f8145f5bdc/bsc/mainnet'
// const bscRpcEndpoint = 'https://msrcl8jozqau.usemoralis.com:2053/server/nZaNdXv9LMrhTahKmpV3pIgWrpyIWYTXE3gJbGuA'

const bscWeb3 = new Web3(bscRpcEndpoint)

const PANCAKESWAP_EFX_ADDRESS = '0xAf1DB0c88a2Bd295F8EdCC8C73f9eB8BcEe6fA8a'
const pancakeswapAbi = JSON.parse(fs.readFileSync(path.join(__dirname, 'pancake_efx_abi.json'), 'utf8'))

const pancakeContract = new bscWeb3.eth.Contract(pancakeswapAbi, PANCAKESWAP_EFX_ADDRESS)

let tally = 0

const getEvents = async (head, tail) => {
    // What are the event names: allEvents, Swap
    try {
        const events =  await pancakeContract.getPastEvents('allEvents', {
            fromBlock: head,
            toBlock: tail
        })
        console.log(`${tally}. Succesfully retrieved: ${events.length}`)
        tally++
        return events
    } catch (error) {
        console.error(error)
    }
}        

const main = async () => {
    const contractDeployementBlock = 7580000
    const latestBlock = await bscWeb3.eth.getBlock('latest')
    const latestBlockHeight = latestBlock.number

    let swapEvents = []
    let pointer = contractDeployementBlock + 5000
    let previousPointer = contractDeployementBlock

    while (pointer <= latestBlockHeight) {
        swapEvents.push(await getEvents(previousPointer, pointer))
        previousPointer = pointer
        pointer += 5000

        if(pointer > latestBlockHeight) {
            pointer = latestBlockHeight
            swapEvents.push(await getEvents(previousPointer, pointer))
            break
        } 
    }

    return swapEvents
}

(async () => {
    try {
        console.time('pancake contract events')
        const result = await main()
        console.log(`
            Swap Events on PancakeSwap 
            length: ${result.length}\n
            ${result}
        `)  
        fs.writeFileSync(path.join(__dirname, 'pancake_all_events.json'), JSON.stringify(result, null, 2))
        console.timeEnd('pancake contract events')
    } catch (error) {
        console.error(error)
    }
})()
