# Dao_Pancake_Fee

```
$ node index.js --help
 _____  __  __           _     _   _      _                      _
| ____|/ _|/ _| ___  ___| |_  | \ | | ___| |___      _____  _ __| | __
|  _| | |_| |_ / _ \/ __| __| |  \| |/ _ \ __\ \ /\ / / _ \| '__| |/ /
| |___|  _|  _|  __/ (__| |_  | |\  |  __/ |_ \ V  V / (_) | |  |   <
|_____|_| |_|  \___|\___|\__| |_| \_|\___|\__| \_/\_/ \___/|_|  |_|\_\ ✨✨✨

Effect Network: Pancake Liquidity Pool Fee Calculator 💸💸💸
Usage: index.js [options]


Options:
  -s, --start    Start block number                          [default: 7580000]
  -e, --end      End block number                           [default: "latest"]
  -r, --rpc      BSC RPC endpoint[default: "https://bsc-dataseed.binance.org/"]
  -f, --file     Save file to disk                    [boolean] [default: true]
  -m, --html     Create HTML report                                   [boolean]
  -p, --pipe     Pipe to stdout                                       [boolean]
  -j, --json     Output as json                       [boolean] [default: true]
  -c, --csv      Output as csv                                        [boolean]
  -h, --help     Show help                                            [boolean]
  -v, --version  Show version number                                  [boolean]

 🌴
```
---

# 📓 Why?
This tool is used to get the pancakeSwap fees for Effect Network.


# 🌟 Features
- Retrieve a detailed overview of the pancake swap fees collected by Effect in the liquidity Pool
- Output to json/csv
- Generate html document
- Search within ranges


# 📌 Requirements
You will need node and npm in order to get this progam running. 
You can download them here: https://nodejs.org/en/download/

# 🚀 Quick and dirty

Clone this repository, install the modules and run it.
```
git clone https://github.com/effectai/Dao_Pancake_Fee.git
npm install
node index.js --help
```

It can take a while to query the bsc node to get all of the transactions.

# 👟 Usage
Simply type pancake-efx in to your terminal of choice and you'll get an output of how to use this tool. It is hihgly recomended to use another BSC RPC endpoint instead of the default one provided with this tools. 
Here are some options: 
- https://moralis.io/ (Currently Recommended)
- https://www.quicknode.com/
- https://www.ankr.com/
- https://web3api.com/
- https://www.curvegrid.com/
