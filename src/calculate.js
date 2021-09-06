const Web3 = require('web3')
const BN = Web3.utils.BN
const fs = require('fs')
const path = require('path')

const bsc = new Web3('https://speedy-nodes-nyc.moralis.io/89694b76348bf1a5042c306d/bsc/mainnet/archive')
const PANCAKESWAP_EFX_ADDRESS = '0xAf1DB0c88a2Bd295F8EdCC8C73f9eB8BcEe6fA8a'
const FOUNDATION_BSC_ADDRESS = '0xb57a461681e57aa9f6bcb3f41f68cf270466dcae'
const pancakeswapAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../abi/pancake_efx_abi.json'), 'utf8'))
const pancakeContract = new bsc.eth.Contract(pancakeswapAbi, PANCAKESWAP_EFX_ADDRESS)    

const formatFee = (fee) => Web3.utils.fromWei(fee)
const buildList = (data) => data.map(tx => feeObject(tx))

/**
 * Calculate the fee for a transaction and build a fee object
 * @param {Object} tx - transaction object
 * @return {Object} fee object
 */
const feeObject = (tx) => {
    // PancakeSwap Contract
    const totalSupply = pancakeContract.methods.totalSupply().call({}, tx.blockNumber)
    const foundationBalance = pancakeContract.methods.balanceOf(FOUNDATION_BSC_ADDRESS).call({}, tx.blockNumber);
    const efxPcsLpRatio = new BN(foundationBalance / totalSupply);

    const totalFee = new BN('25'); // 0.25%
    const lpFee = new BN('17'); // 0.17%
    const pcstFee = new BN('3'); // 0.03%
    const cakeFee = new BN('5'); // 0.05%
    const divider = new BN('10000') // divide by 1000 to get the right precision

    let txFeeResponse = {
        transactionHash: null,
        address: null,
        totalFee: null,
        lpFee: null,
        pcstFee: null,
        cakeFee: null,
        swapFrom: null, // WBNB or EFX
        swapTo: null, // EFX or WBNB
        swapAmountFrom: new BN('0'),
        swapAmountTo: new BN('0'),
        totalFeeFormatted: new BN('0'),
        lpFeeFormatted: new BN('0'),
        efxFeesFormatted: new BN('0'),
        wbnbFeesFormatted: new BN('0'),
        inOutEfx: new BN('0'),
        inOutWbnb: new BN('0'),
        totalCalculatedToEFX: null,
        totalCalculatedToWBNB: null,
    }

    if (tx.returnValues.amount0In != "0") {
        txFeeResponse.swapFrom = 'WBNB'
        txFeeResponse.swapTo = 'EFX'
        txFeeResponse.swapAmountFrom = new BN(tx.returnValues.amount0In)
        txFeeResponse.swapAmountTo = new BN(tx.returnValues.amount1Out)
        txFeeResponse.onlyWbnb = new BN(tx.returnValues.amount0In)
        txFeeResponse.onlyEfx = new BN(tx.returnValues.amount1Out)
    }

    if (tx.returnValues.amount1In != "0") {
        txFeeResponse.swapFrom = 'EFX'
        txFeeResponse.swapTo = 'WBNB'
        txFeeResponse.swapAmountFrom = new BN(tx.returnValues.amount1In)
        txFeeResponse.swapAmountTo = new BN(tx.returnValues.amount0Out)
        txFeeResponse.onlyWbnb = new BN(tx.returnValues.amount0Out)
        txFeeResponse.onlyEfx = new BN(tx.returnValues.amount1In)
    }

    // check if sender is the same as to address
    // if (tx.returnValues.sender !== tx.returnValues.to) {
    //     console.error(`The sender is not the same as the to address: \n${JSON.stringify(tx, null, 2)}`)
    // }
    
    txFeeResponse.transactionHash   = tx.transactionHash
    txFeeResponse.address           = tx.returnValues.sender

    // These are calculated from the input values (efx and wbnb respectively)
    txFeeResponse.totalFee          = totalFee.mul(txFeeResponse.swapAmountFrom).div(divider)
    txFeeResponse.lpFee             = lpFee.mul(txFeeResponse.swapAmountFrom.mul(efxPcsLpRatio)).div(divider)
    txFeeResponse.pcstFee           = pcstFee.mul(txFeeResponse.swapAmountFrom).div(divider)
    txFeeResponse.cakeFee           = cakeFee.mul(txFeeResponse.swapAmountFrom).div(divider)
    // txFeeResponse.totalFeeFormatted = txFeeResponse.totalFee
    // txFeeResponse.lpFeeFormatted    = txFeeResponse.lpFee

    if (txFeeResponse.swapFrom === 'WBNB') {
        txFeeResponse.wbnbFeesFormatted = txFeeResponse.totalFee
    } else {
        txFeeResponse.efxFeesFormatted = txFeeResponse.totalFee
    }

    txFeeResponse.totalCalculatedToEFX   = txFeeResponse.onlyEfx.mul(lpFee).div(divider)
    txFeeResponse.totalCalculatedToWBNB  = txFeeResponse.onlyWbnb.mul(lpFee).div(divider)

    return txFeeResponse
}

const buildSummary = (data) => {
    const inputEFXFees = data.reduce((a, b) => a.add((b.efxFeesFormatted)), new BN('0'))
    const inputWBNBFees = data.reduce((a, b) => a.add(b.wbnbFeesFormatted), new BN('0'))

    const totalFeesEfxOnly = data.reduce((a, b) => a.add(b.totalCalculatedToEFX), new BN('0'))
    const totalFeesWbnbOnly = data.reduce((a, b) => a.add(b.totalCalculatedToWBNB), new BN('0'))
    
    const totalSwaps = data.length
    const totalEfxSwaps = data.filter(tx => tx.swapFrom === 'EFX').length
    const totalWbnbSwaps = data.filter(tx => tx.swapFrom === 'WBNB').length
    const averageEFXFeesPerSwap = formatFee(inputEFXFees) / totalEfxSwaps
    const averageWBNBFeesPerSwap = formatFee(inputWBNBFees) / totalWbnbSwaps

    // const maxSwapEfx = data.reduce((a, b) => BN.max(a.efxFeesFormatted, b.efxFeesFormatted))
    // const maxSwapWBNB = data.reduce((a, b) => BN.max(a.wbnbFeesFormatted, b.wbnbFeesFormatted))

    return {
        inputEFX: formatFee(inputEFXFees),
        totalCalculatedToEFX: formatFee(totalFeesEfxOnly),

        inputWBNB: formatFee(inputWBNBFees),
        totalCalculatedToWBNB: formatFee(totalFeesWbnbOnly),
        totalSwaps: totalSwaps,

        totalEfxSwaps: totalEfxSwaps,
        totalWbnbSwaps: totalWbnbSwaps,

        efxPercentage: Math.round(totalEfxSwaps / totalSwaps * 100),
        wbnbPercentage: Math.round(totalWbnbSwaps / totalSwaps * 100),

        averageEFXFeesPerSwap: averageEFXFeesPerSwap,
        averageWBNBFeesPerSwap: averageWBNBFeesPerSwap,

        // maxSwapEfx: maxSwapEfx,
        // maxSwapWBNB: maxSwapWBNB,
    }
}

module.exports = {
    feeObject,
    buildList,
    buildSummary
}