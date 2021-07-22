const fs = require('fs')
const path = require('path')
const Web3 = require('web3')
const papaparse = require('papaparse')
const BN = Web3.utils.BN
const decimals = 18 // wbnb and efx have 18 decimals
const cleanJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'clean_pancake_swap_events.json'), 'utf8'))

const pcsRouterContract = '0x10ED43C718714eb63d5aA57B78B54704E256024E'
const pefxToken = '0xc51ef828319b131b595b7ec4b28210ecf4d05ad0'
const wbnbToken = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
const pancakeSwapEFXContract = '0xaf1db0c88a2bd295f8edcc8c73f9eb8bcee6fa8a'

const calculateFee = (tx) => {
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
        totalFeeFormatted: null,
        efxFeesFormatted: null,
        wbnbFeesFormatted: null,
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
    txFeeResponse.lpFee = lpFee * txFeeResponse.swapAmountFrom
    txFeeResponse.pcstFee = pcstFee * txFeeResponse.swapAmountFrom
    txFeeResponse.cakeFee = cakeFee * txFeeResponse.swapAmountFrom
    txFeeResponse.totalFeeFormatted = Web3.utils.fromWei(new BN(txFeeResponse.totalFee.toString()), 'ether')

    if (txFeeResponse.swapFrom === 'WBNB') {
        txFeeResponse.wbnbFeesFormatted = txFeeResponse.totalFeeFormatted
    } else {
        txFeeResponse.efxFeesFormatted = txFeeResponse.totalFeeFormatted
    }

    return txFeeResponse
}

const calculatedFees = cleanJson.map(tx => calculateFee(tx))
console.log(calculatedFees)

const csv = papaparse.unparse(calculatedFees)
fs.writeFileSync(path.join(__dirname, 'calculated_fees.csv'), csv)



/**
 *  {
      "address": "0xAf1DB0c88a2Bd295F8EdCC8C73f9eB8BcEe6fA8a",
      "blockNumber": 9349146,
      "transactionHash": "0x3c451556b831cea82e574473f407355fae894fc2568d7c9f98d8c984693eb197",
      "transactionIndex": 26,
      "blockHash": "0xb9499f388c4b7e13d449d3c6111e3be5d18eba1c4808fd85316efa56445d33c2",
      "logIndex": 82,
      "removed": false,
      "id": "log_2fde2063",
      "returnValues": {
        "0": "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        "1": "0",                           // WBNB
        "2": "5321000000000000000000",      // EFX
        "3": "341931535531219146",          // WBNB
        "4": "0",                           // EFX
        "5": "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16",
        "sender": "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        "amount0In": "0",                       // WBNB
        "amount1In": "5321000000000000000000",  // EFX
        "amount0Out": "341931535531219146",     // WBNB
        "amount1Out": "0",                      // EFX   
        "to": "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16"
      },
      "event": "Swap",
      "signature": "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
      "raw": {
        "data": "0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012073b57c223d84000000000000000000000000000000000000000000000000000004bec8eb80d798ca0000000000000000000000000000000000000000000000000000000000000000",
        "topics": [
          "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
          "0x00000000000000000000000010ed43c718714eb63d5aa57b78b54704e256024e",
          "0x00000000000000000000000058f876857a02d6762e0101bb5c46a8c1ed44dc16"
        ]
      }
    }
    */
