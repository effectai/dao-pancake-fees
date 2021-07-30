const Web3 = require('web3')
const BN = Web3.utils.BN

const formatFee = (fee) => Web3.utils.fromWei(fee)
const buildList = (data) => data.map(tx => feeObject(tx))

/**
 * Calculate the fee for a transaction and build a fee object
 * @param {Object} tx - transaction object
 * @param {number} efxPcsLpRatio - EFX/WBNB fee ratio, default is 0.98, must be a number between 0 and 1
 * @return {Object} fee object
 */
const feeObject = (tx, efxPcsLpRatio = new BN('0.98')) => {
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
        totalEfxOnlyFee: null,
        totalWbnbOnlyFee: null,
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
    txFeeResponse.totalFee          = totalFee.mul(txFeeResponse.swapAmountFrom).div(divider)
    txFeeResponse.lpFee             = lpFee.mul(txFeeResponse.swapAmountFrom.mul(efxPcsLpRatio)).div(divider)
    txFeeResponse.pcstFee           = pcstFee.mul(txFeeResponse.swapAmountFrom).div(divider)
    txFeeResponse.cakeFee           = cakeFee.mul(txFeeResponse.swapAmountFrom).div(divider)
    // txFeeResponse.totalFeeFormatted = txFeeResponse.totalFee
    // txFeeResponse.lpFeeFormatted    = txFeeResponse.lpFee

    txFeeResponse.totalEfxOnlyFee   = txFeeResponse.onlyEfx.mul(lpFee).div(divider)
    txFeeResponse.totalWbnbOnlyFee  = txFeeResponse.onlyWbnb.mul(lpFee).div(divider)

    if (txFeeResponse.swapFrom === 'WBNB') {
        txFeeResponse.wbnbFeesFormatted = txFeeResponse.totalFee
    } else {
        txFeeResponse.efxFeesFormatted = txFeeResponse.totalFee
    }

    return txFeeResponse
}

const buildSummary = (data) => {
    
    const totalEFXFees = data.reduce((a, b) => a.add((b.efxFeesFormatted)), new BN('0'))
    const totalWBNBFees = data.reduce((a, b) => a.add(b.wbnbFeesFormatted), new BN('0'))

    const totalFeesEfxOnly = data.reduce((a, b) => a.add(b.totalEfxOnlyFee), new BN('0'))
    const totalFeesWbnbOnly = data.reduce((a, b) => a.add(b.totalWbnbOnlyFee), new BN('0'))
    
    const totalSwaps = data.length
    const totalEfxSwaps = data.filter(tx => tx.swapFrom === 'EFX').length
    const totalWbnbSwaps = data.filter(tx => tx.swapFrom === 'WBNB').length
    const averageEFXFeesPerSwap = totalEFXFees / totalEfxSwaps
    const averageWBNBFeesPerSwap = totalWBNBFees / totalWbnbSwaps

    // const minSwapEfx = data.reduce((a, b) => Math.min(a, b.efxFeesFormatted), Infinity)
    // const maxSwapEfx = data.reduce((a, b) => BN.max(a.efxFeesFormatted, b.efxFeesFormatted))
    
    // const minSwapWBNB = data.reduce((a, b) => Math.min(a, b.wbnbFeesFormatted), Infinity)
    // const maxSwapWBNB = data.reduce((a, b) => BN.max(a.wbnbFeesFormatted, b.wbnbFeesFormatted))

    return {
        // totalEFXFees: totalEFXFees,
        inputEFX: formatFee(totalEFXFees),
        totalCalculatedToEFX: formatFee(totalFeesEfxOnly),
        // totalFeesEfxOnly: totalFeesEfxOnly,
        // totalWBNBFees: totalWBNBFees,
        inputWBNB: formatFee(totalWBNBFees),
        totalCalculatedtoWBNB: formatFee(totalFeesWbnbOnly),
        totalSwaps: totalSwaps,
        totalEfxSwaps: totalEfxSwaps,
        totalWbnbSwaps: totalWbnbSwaps,
        // efxPercentage: Math.round(totalEfxSwaps / totalSwaps * 100),
        // wbnbPercentage: Math.round(totalWbnbSwaps / totalSwaps * 100),
        // averageEFXFeesPerSwap: averageEFXFeesPerSwap,
        // averageWBNBFeesPerSwap: averageWBNBFeesPerSwap
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