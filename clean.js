const fs = require('fs')
const path = require('path')
const Web3 = require('web3')
const BN = Web3.utils.BN

const swapJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'pancake_swap_events.json'), 'utf8'))

const pcsRouterContract = '0x10ED43C718714eb63d5aA57B78B54704E256024E'
const pefxToken = '0xc51ef828319b131b595b7ec4b28210ecf4d05ad0'
const wbnbToken = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
const pancakeSwapEFXContract = '0xaf1db0c88a2bd295f8edcc8c73f9eb8bcee6fa8a'


const cleanJson = () => {
    let eventArray = []
    for (const arr of swapJson) {
        arr.forEach(event => {
            eventArray.push(event)
        })
    }
}

const clean = () => {
    let eventArray = []
    Array.from(swapJson).forEach(array => {
        console.log(array)
        if(array != null){            
            Array.from(array).forEach(event => {
                eventArray.push(event)
            })
        }
    })
    return eventArray
}

console.log(swapJson)
console.log(clean())

fs.writeFileSync(path.join(__dirname, 'clean_pancake_swap_events.json'), JSON.stringify(clean()), 'utf8')

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
        "1": "0",
        "2": "5321000000000000000000",
        "3": "341931535531219146",
        "4": "0",
        "5": "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16",
        "sender": "0x10ED43C718714eb63d5aA57B78B54704E256024E",
        "amount0In": "0",
        "amount1In": "5321000000000000000000",
        "amount0Out": "341931535531219146",
        "amount1Out": "0",
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
