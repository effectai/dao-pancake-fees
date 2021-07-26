const Web3 = require('web3')
const BN = Web3.utils.BN

/**
 * Calculate the fee for a transaction and build a fee object
 * @param {Object} tx - transaction object
 * @param {number} efxPcsLpRatio - EFX/WBNB fee ratio, default is 0.98, must be a number between 0 and 1
 * @return {Object} fee object
 */
const feeObject = (tx, efxPcsLpRatio = 0.98) => {
    const totalFee = 0.0025;
    const lpFee = 0.0017;
    const pcstFee = 0.0003;
    const cakeFee = 0.0005;

    let txFeeResponse = {
        transactionHash: null,
        address: null,
        totalFee: null,
        lpFee: null,
        pcstFee: null,
        cakeFee: null,
        swapFrom: null, // WBNB or EFX
        swapTo: null, // EFX or WBNB
        swapAmountFrom: null,
        swapAmountTo: null,
        totalFeeFormatted: 0,
        lpFeeFormatted: 0,
        efxFeesFormatted: 0,
        wbnbFeesFormatted: 0,
    }

    if (tx.returnValues.amount0In != "0") {
        txFeeResponse.swapFrom = 'WBNB'
        txFeeResponse.swapTo = 'EFX'
        txFeeResponse.swapAmountFrom = tx.returnValues.amount0In
        txFeeResponse.swapAmountTo = tx.returnValues.amount1Out
    }

    if (tx.returnValues.amount1In != "0") {
        txFeeResponse.swapFrom = 'EFX'
        txFeeResponse.swapTo = 'WBNB'
        txFeeResponse.swapAmountFrom = tx.returnValues.amount1In
        txFeeResponse.swapAmountTo = tx.returnValues.amount0Out
    }

    // check if sender is the same as to address
    // if (tx.returnValues.sender !== tx.returnValues.to) {
    //     console.error(`The sender is not the same as the to address: \n${JSON.stringify(tx, null, 2)}`)
    // }
    
    txFeeResponse.transactionHash = tx.transactionHash
    txFeeResponse.address = tx.returnValues.sender
    txFeeResponse.totalFee = totalFee * txFeeResponse.swapAmountFrom
    txFeeResponse.lpFee = lpFee * txFeeResponse.swapAmountFrom * efxPcsLpRatio
    txFeeResponse.pcstFee = pcstFee * txFeeResponse.swapAmountFrom
    txFeeResponse.cakeFee = cakeFee * txFeeResponse.swapAmountFrom
    txFeeResponse.totalFeeFormatted = Web3.utils.fromWei(new BN(txFeeResponse.totalFee.toString()), 'ether')
    txFeeResponse.totalFeeFormatted = Web3.utils.fromWei(new BN(txFeeResponse.lpFee.toString()), 'ether')

    if (txFeeResponse.swapFrom === 'WBNB') {
        txFeeResponse.wbnbFeesFormatted = txFeeResponse.totalFeeFormatted
    } else {
        txFeeResponse.efxFeesFormatted = txFeeResponse.totalFeeFormatted
    }

    return txFeeResponse
}

const buildList = (data) => {
    const calculatedFees = data.map(tx => feeObject(tx))
    return calculatedFees
}

const buildSummary = (data) => {
    const totalEFXFees = data.reduce((a, b) => a + b.efxFeesFormatted, 0)
    const totalWBNBFees = data.reduce((a, b) => a + b.wbnbFeesFormatted, 0)
    
    const totalSwaps = data.length
    const totalEFXFeesPerSwap = totalEFXFees / totalSwaps
    const totalWBNBFeesPerSwap = totalWBNBFees / totalSwaps


    const averageEFXFeesPerSwap = totalEFXFees / totalSwaps
    const averageWBNBFeesPerSwap = totalWBNBFees / totalSwaps
    

    // const maxSwapEfx = data.reduce(a => a.efxFeesFormatted, Math.max)
    // const minSwapEfx = data.reduce(a => a.efxFeesFormatted, Math.min)
    
    // const maxSwapWBNB = data.reduce(a => a.wbnbFeesFormatted, Math.max)
    // const minSwapWBNB = data.reduce(a => a.wbnbFeesFormatted, Math.min)

    return {
        totalEFXFees: totalEFXFees,
        totalWBNBFees: totalWBNBFees,
        totalSwaps: totalSwaps,
        totalEFXFeesPerSwap: totalEFXFeesPerSwap,
        totalWBNBFeesPerSwap: totalWBNBFeesPerSwap,
        averageEFXFeesPerSwap: averageEFXFeesPerSwap,
        averageWBNBFeesPerSwap: averageWBNBFeesPerSwap,
        // maxSwapEfx: maxSwapEfx,
        // minSwapEfx: minSwapEfx,
        // maxSwapWBNB: maxSwapWBNB,
        // minSwapWBNB: minSwapWBNB,
    }
}

module.exports = {
    feeObject,
    buildList,
    buildSummary
}