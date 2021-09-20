const Web3 = require('web3')
const fs = require('fs')
const path = require('path')

// PancakeSwap Contract
const bsc = new Web3('https://speedy-nodes-nyc.moralis.io/89694b76348bf1a5042c306d/bsc/mainnet/archive')
const PANCAKESWAP_EFX_ADDRESS = '0xAf1DB0c88a2Bd295F8EdCC8C73f9eB8BcEe6fA8a'
const FOUNDATION_BSC_ADDRESS = '0xb57a461681e57aa9f6bcb3f41f68cf270466dcae'
const pancakeswapAbi = JSON.parse(fs.readFileSync(path.join(__dirname, '../abi/pancake_efx_abi.json'), 'utf8'))
const pancakeContract = new bsc.eth.Contract(pancakeswapAbi, PANCAKESWAP_EFX_ADDRESS)   

// Utils
const formatFee = (fee) => Web3.utils.fromWei(fee)
const buildList = async (data) => data.map(async (tx) => await feeObject(tx))
const buildArchiveList = async (data) => data.map(async (tx) => await archiveFeeObject(tx))
const BN = (value) => new Web3.utils.BN(value)

// Fee percentages
const divider  = BN(10000) // divide by 10K to get the right precision
const totalFee = BN(25) // 0.25%
const lpFee    = BN(17) // 0.17%
const pcstFee  = BN(3)  // 0.03%
const cakeFee  = BN(5)  // 0.05%

/**
 * Calculate the fee for a transaction and build a fee object
 * @param {Object} tx - transaction object
 * @return {Object} fee object
 */
const feeObject = async (tx) => {
    const totalSupply = BN(await pancakeContract.methods.totalSupply().call({}, tx.block_height).catch(console.error))
    const foundationBalance = BN(await pancakeContract.methods.balanceOf(FOUNDATION_BSC_ADDRESS).call({}, tx.block_height).catch(console.error))
    const efxPcsLpRatio = foundationBalance.div(totalSupply);

    let txFee = {
        tx_hash: null,
        from_address: null,
        totalFee: null,
        lpFee: null,
        pcstFee: null,
        cakeFee: null,
        swapFrom: null, // WBNB or EFX
        swapTo: null, // EFX or WBNB
        swapAmountFrom: BN(0),
        swapAmountTo: BN(0),
        totalFeeFormatted: BN(0),
        lpFeeFormatted: BN(0),
        efxFeesFormatted: BN(0),
        wbnbFeesFormatted: BN(0),
        inOutEfx: BN(0),
        inOutWbnb: BN(0),
        onlyEfx: BN(0),
        onlyWbnb: BN(0),
        transfer_delta_efx: BN(0),
        totalCalculatedToEFX: null,
        totalCalculatedToWBNB: null,
    }

    if (tx.transfers_transfer_type == "IN") {
        txFee.swapFrom = 'WBNB'
        txFee.swapTo = 'EFX'
        txFee.swapAmountFrom = BN(tx.returnValues.amount0In ?? 0)
        txFee.swapAmountTo = BN(tx.returnValues.amount1Out ?? 0)
        txFee.onlyWbnb = BN(tx.returnValues.amount0In ?? 0)
        txFee.onlyEfx = BN(tx.returnValues.amount1Out ?? 0)
    }

    if (tx.transfers_transfer_type == "OUT") {
        txFee.swapFrom = 'EFX'
        txFee.swapTo = 'WBNB'
        txFee.swapAmountFrom = BN(tx.returnValues.amount1In ?? 0)
        txFee.swapAmountTo = BN(tx.returnValues.amount0Out ?? 0)
        txFee.onlyWbnb = BN(tx.returnValues.amount0Out ?? 0)
        txFee.onlyEfx = BN(tx.returnValues.amount1In ?? 0)

    }

    // check if sender is the same as to from_address
    // if (tx.returnValues.sender !== tx.returnValues.to) {
    //     console.error(`The sender is not the same as the to from_address: \n${JSON.stringify(tx, null, 2)}`)
    // }
    

    txFeeResponse.transactionHash   = tx.tx_hash
    txFeeResponse.address           = tx.from_address

    // These are calculated from the input values (efx and wbnb respectively)
    txFee.totalFee          = totalFee.mul(txFee.swapAmountFrom)
    txFee.lpFee             = lpFee.mul(txFee.swapAmountFrom.mul(efxPcsLpRatio))
    txFee.pcstFee           = pcstFee.mul(txFee.swapAmountFrom)
    txFee.cakeFee           = cakeFee.mul(txFee.swapAmountFrom)
    txFee.totalFeeFormatted = txFee.totalFee
    txFee.lpFeeFormatted    = txFee.lpFee


    if (txFee.swapFrom === 'WBNB') {
        txFee.wbnbFeesFormatted = txFee.totalFee
    } else {
        txFee.efxFeesFormatted = txFee.totalFee
    }

    // txFee.totalCalculatedToEFX   = txFee.onlyEfx.mul(lpFee).div(divider)
    // txFee.totalCalculatedToWBNB  = txFee.onlyWbnb.mul(lpFee).div(divider)

    return txFee
}

const archiveFeeObject = async (tx) => {
    const totalSupply = BN(await pancakeContract.methods.totalSupply().call({}, tx.block_height).catch(console.error))
    const foundationBalance = BN(await pancakeContract.methods.balanceOf(FOUNDATION_BSC_ADDRESS).call({}, tx.block_height).catch(console.error))
    const efxPcsLpRatio = foundationBalance.div(totalSupply);

    let txFee = {}

    txFee.transfer_delta_efx = BN(tx.transfers_delta ?? 0)
    txFee.tx_hash = tx.tx_hash
    txFee.from_address = tx.from_address

    txFee.totalFee          = totalFee.mul(txFee.transfer_delta_efx).div(divider)
    txFee.lpFee             = lpFee.mul(txFee.transfer_delta_efx.mul(efxPcsLpRatio)).div(divider)
    txFee.pcstFee           = pcstFee.mul(txFee.transfer_delta_efx).div(divider)
    txFee.cakeFee           = cakeFee.mul(txFee.transfer_delta_efx).div(divider)

    txFee.totalSupply       = totalSupply
    txFee.foundationBalance = foundationBalance
    txFee.efxPcsLpRatio     = efxPcsLpRatio
    txFee.feeRatioCollection = txFee.lpFee

    console.log(txFee)

    return txFee
}

const buildArchiveSummary = async (data) => {
    const foundationTotal = data.reduce((acc, val) => acc.add(val.feeRatioCollection), BN(0))
    return {
        foundationTotal: foundationTotal
    }
}

const buildSummary = async (data) => {
    const inputEFXFees = data.reduce((a, b) => a.add((b.efxFeesFormatted)), BN(0))
    const inputWBNBFees = data.reduce((a, b) => a.add(b.wbnbFeesFormatted), BN(0))

    const totalFeesEfxOnly = data.reduce((a, b) => a.add(b.totalCalculatedToEFX), BN(0))
    const totalFeesWbnbOnly = data.reduce((a, b) => a.add(b.totalCalculatedToWBNB), BN(0))
    
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
    buildArchiveSummary,
    archiveFeeObject,
    buildArchiveList,
    buildSummary
}