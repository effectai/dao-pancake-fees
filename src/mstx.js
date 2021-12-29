const fs = require('fs-extra');
const path = require('path')
const dotenv = require('dotenv');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const {Api, JsonRpc, RpcError } = require('eosjs');
const { TextDecoder, TextEncoder } = require('util');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig')
const fetch = require('node-fetch')

const argv = yargs(hideBin(process.argv))
    .default({
        privatekey: ""
    })
    .describe('privatekey', 'PrivateKey for EOS signature provider').alias('privatekey', 'p')
    .argv

// TODO Change Default Private key to something that is correct.
const defaultPrivateKey = argv.privatekey; // bob
const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);

const rpc_url = 'https://eos.greymass.com'
const rpc = new JsonRpc(rpc_url, { fetch })
const api = new Api({ 
    rpc: rpc, 
    signatureProvider: signatureProvider,  
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder()
})

const fileBuffer = fs.readFileSync(path.join(__dirname, '../data/index.json'))
const fileJson = JSON.parse(fileBuffer)

// CREATE ACTION TO PROPOSE a new EFX transaction to the dao.
const actions = [{

    account: 'effecttokens', // Name of the contract
    name: 'transfer', // Name of the action

    // Agent who will execute this action
    authorization: [{
        actor: 'signer1.efx',
        permission: 'active',
    }],

    // transaction parameters
    data: {
        "from": "bsc.efx", // From BSC Pool
        "to": "feepool.efx", // To Dao Fee Pool 
        "quantity": `${fileJson.foundationTotal_EFX} EFX`, 
        "memo": `Pancake Swap Fees, StartBlock: ${fileJson.startBlock}, EndBlock: ${fileJson.endBlock}`
    },
}];

(async () => {
    try {
        const serialized_actions = await api.serializeActions(actions)

        // Expire 24 hours from now
        const addHours = (hours) => new Date((new Date()).getTime() + hours * 60 * 60 * 1000);
        const expiration24Hours = addHours(24).toISOString().slice(0, -5); // remove milliseconds and Z from ISO string
        console.log(`Expiration Time: ${expiration24Hours}`)
    
        // BUILD THE MULTISIG PROPOSE TRANSACTION
        const proposeInput = {
            proposer: 'singer1.efx',
            proposal_name: 'transfer',
            requested: [
                {
                    actor: 'singer1.efx',
                    permission: 'active'
                },
                {
                    actor: 'signer2.efx',
                    permission: 'active'
                },
                {
                    actor: 'signer3.efx',
                    permission: 'active'
                }
            ],
            trx: {            
                expiration: expiration24Hours, 
                ref_block_num: 0,
                ref_block_prefix: 0,
                max_net_usage_words: 0,
                max_cpu_usage_ms: 0,
                delay_sec: 0,
                context_free_actions: [],
                actions: serialized_actions,
                transaction_extensions: []
            }
        };
    
        //PROPOSE THE TRANSACTION
        const result = await api.transact({
            actions: [{
                account: 'eosio.msig',
                name: 'propose',
                authorization: [{
                    actor: 'singer1.efx',
                    permission: 'active',
                }],
                data: proposeInput,
            }]
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
            broadcast: true,
            sign: true
        });
    
        console.log(result)        
    } catch (error) {
        console.error(`\nCaught Exception: ${error}`)

        if (error instanceof RpcError) {
            console.log(JSON.stringify(error.json, null, 2))
        }
    }
})();