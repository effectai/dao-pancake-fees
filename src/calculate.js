const Web3 = require('web3')
const fs = require('fs')
const path = require('path')
const {getFoundationBalance, getTotalSupply, getBlockDateTime} = require('./contract')
const pThrottle = require('p-throttle')

// One global variable to keep track of the last block processed
let lastBlockHeight;

// Utils
const formatFee         = (fee) => Web3.utils.fromWei(fee)
const BN                = (value) => new Web3.utils.BN(value)
const buildArchiveList  = async (data) => data.map(async (tx) => await archiveFeeObject(tx))

// Fee percentages, val * xFee / feeDivider
const feeDivider  = BN(10000) // divide by 10K to get the right precision
const totalFee    = BN(25) // 0.25%
const lpFee       = BN(17) // 0.17%
const pcstFee     = BN(3)  // 0.03%
const cakeFee     = BN(5)  // 0.05%

const archiveFeeObject = async (tx) => {
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

    try {

        lastBlockHeight = tx.block_height ?? lastBlockHeight

        txFee.block_height = tx.block_height ?? lastBlockHeight
        txFee.transfer_delta_efx = BN(tx.transfers_delta ?? 0)
        txFee.tx_hash = tx.tx_hash
        txFee.from_address = tx.from_address

        const percentage = BN(100)

        const totalSupply = await getTotalSupply(tx.block_height)
        const foundationBalance = await getFoundationBalance(tx.block_height)

        const efxPcsRatioed = BN((foundationBalance / totalSupply) * 100) // this becomes a percentage (~90% / ~60%)
        
        txFee.totalFee          = totalFee.mul(txFee.transfer_delta_efx).div(feeDivider)
        txFee.pcstFee           = pcstFee.mul(txFee.transfer_delta_efx).div(feeDivider)
        txFee.cakeFee           = cakeFee.mul(txFee.transfer_delta_efx).div(feeDivider)

        // const deltaRatio     = BN((txFee.transfer_delta_efx * efxPcsRatioed).toString())      

        const deltaRatio        = txFee.transfer_delta_efx.mul(efxPcsRatioed).div(percentage)
        txFee.lpFee             = lpFee.mul(deltaRatio).div(feeDivider)

        txFee.totalSupply       = totalSupply
        txFee.foundationBalance = foundationBalance
        txFee.efxPcsRatioed     = efxPcsRatioed
        
        // console.log(`Ratio: ${efxPcsRatioed.toString()}, FoundationBalance: ${foundationBalance.toString()} / TotalSupply: ${totalSupply.toString()}, block_height: ${tx.block_height}`)
        // console.log(txFee.efxPcsRatioed.toString(), txFee.transfer_delta_efx.toString(), txFee.lpFee.toString())
    
        return txFee        
    } catch (error) {
        console.error(error)
    }
}

const buildArchiveSummary = async (data, startBlock, endBlock) => {
    const foundationTotal = data.reduce((acc, val) => acc.add(val.lpFee), BN(0))
    const deltaTotal = data.reduce((acc, val) => acc.add(val.transfer_delta_efx), BN(0))
    // const maxSwapEfx = data.reduce((a, b) => Web3.utils.BN.max(BN(a.transfer_delta_efx), BN(b.transfer_delta_efx)))

    const totalSupplyBegin = await getTotalSupply(startBlock).catch(console.error)
    const foundationBalanceBegin = await getFoundationBalance(startBlock).catch(console.error)
    const ratioBegin = foundationBalanceBegin / totalSupplyBegin

    const totalSupplyEnd = await getTotalSupply(endBlock).catch(console.error)
    const foundationBalanceEnd = await getFoundationBalance(endBlock).catch(console.error)
    const ratioEnd = foundationBalanceEnd / totalSupplyEnd

    const averageRatio = data.reduce((acc, val) => Number(acc) + Number(val.efxPcsRatioed), 0) / data.length

    const now = new Date(Date.now * 1000)

    return {
        latestUpdateDateTime:          now.toUTCString(),
        foundationTotal_EFX:           formatFee(foundationTotal.toString()),
        totalTransactions_EFX:         formatFee(deltaTotal.toString()),
        totalSwaps:                    data.length,
        averageEfxFeePerSwap:          formatFee(foundationTotal) / data.length,
        averageRatio:                  averageRatio,
        startBlock:                    startBlock,
        startBlockDateTime:            await getBlockDateTime(startBlock),
        endBlock:                      endBlock,
        endBlockDateTime:              await getBlockDateTime(endBlock),
        totalSupplyBegin_CakeLP:       formatFee(totalSupplyBegin),
        foundationBalanceBegin_CakeLP: formatFee(foundationBalanceBegin),
        ratioBegin:                    ratioBegin,
        totalSupplyEnd_CakeLP:         formatFee(totalSupplyEnd),
        foundationBalanceEnd_CakeLP:   formatFee(foundationBalanceEnd),
        ratioEnd:                      ratioEnd,
    }
}

module.exports = {
    buildArchiveSummary,
    archiveFeeObject,
    buildArchiveList,
}