const fs = require('fs-extra');
const path = require('path')
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const {Api, JsonRpc, RpcError } = require('eosjs');
const { TextDecoder, TextEncoder } = require('util');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig')
const fetch = require('node-fetch')
const { App } = require('@slack/bolt');

const printMessage = 
`
  ███    ███ ██    ██ ██      ████████ ██       ███████ ██  ██████      ████████ ██   ██ 
  ████  ████ ██    ██ ██         ██    ██       ██      ██ ██              ██     ██ ██  
  ██ ████ ██ ██    ██ ██         ██    ██ █████ ███████ ██ ██   ███        ██      ███   
  ██  ██  ██ ██    ██ ██         ██    ██            ██ ██ ██    ██        ██     ██ ██  
  ██      ██  ██████  ███████    ██    ██       ███████ ██  ██████         ██    ██   ██ 
`
console.log(printMessage)

// Retrieve the command line arguments
const argv = yargs(hideBin(process.argv))
    .describe('privatekey', 'PrivateKey for EOS signature provider').alias('privatekey', 'p')
    .describe('slackbot', 'Slack Bot Token').alias('slackbot', 'b')
    .describe('slackapp', 'Slack App Token').alias('slackapp', 'a')
    .describe('slacksecret', 'Slack Signing Secret').alias('slacksecret', 's')
    // only private key is needed, other options are optional for sending slack notification
    .demandOption(['privatekey'], 'privatekey is required') 
    .argv


/**
 * Build EOS Client
 */
const signatureProvider = new JsSignatureProvider([argv.privatekey]);

const rpc_url = 'https://eos.greymass.com'
const rpc = new JsonRpc(rpc_url, { fetch })
const api = new Api({ 
    rpc: rpc, 
    signatureProvider: signatureProvider,  
    textEncoder: new TextEncoder(),
    textDecoder: new TextDecoder()
})

const fileBuffer = fs.readFileSync(path.join(__dirname, '/dist/index.json'))
const fileJson = JSON.parse(fileBuffer)

const expireTransaction = (hours) => {
    const expire = new Date((new Date()).getTime() + hours * 60 * 60 * 1000); // expire n hours from now
    return expire.toISOString().slice(0, -5); // remove milliseconds and 'Z' from ISO string
}

const transactionName = 'pcstst' //name for the tx

// Create proposal for transfer from bsc.efx -> feepool.efx
const actions = [{
    account: 'effecttokens', // Name of the contract
    name: 'transfer',        // Name of the action

    // Agent who will execute this action, bsc.efx is the from address.
    authorization: [{
        actor: 'bsc.efx',
        permission: 'active',
    }],

    // transaction parameters
    data: {
        "from": "bsc.efx", // From BSC Pool
        "to": "feepool.efx", // To Dao Fee Pool 
        "quantity": `${parseFloat(fileJson.foundationTotal_EFX).toFixed(4)} EFX`, 
        "memo": "Pancake Swap Fee"      
    }
}];

const main = async () => {

        const serialized_actions = await api.serializeActions(actions).catch(error => {
            console.error(error)
            throw error
        });
        // console.log(`\nserialized_actions: ${JSON.stringify(serialized_actions)}\n`);

        // Specify the required agents for this multi-signature transactions
        const proposeInput = {
            proposer: 'pancakeffect',
            proposal_name: transactionName,
            requested: [
                {
                    actor: 'signer1.efx',
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
                expiration: expireTransaction(1), // 3 days from now
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

        // Sign and broadcast the proposal transaction to msig for signers[1,2,3] to sign.
        const transaction = await api.transact({
            actions: [{
                account: 'eosio.msig',
                name: 'propose',
                authorization: [{
                    actor: 'pancakeffect',
                    permission: 'active',
                }],
                data: proposeInput,
            }]
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
            broadcast: true,
            sign: true
        })
        .catch(error => {
            console.error(`\nProposeError: ${error}\n`)
            if (error instanceof RpcError) {
                console.log(error)
            }
            throw error
        });
    
        console.log(`\nTransaction: ${JSON.stringify(transaction)}\n`);   

        if (argv.slackapp) {
            /**
             * Build Slack Client
             */
            const slack = new App({
                signingSecret: argv.slacksecret,
                token: argv.slackbot,
                appToken: argv.slackapp
            });

            // send link to slack with transaction.transaction_id
            await slack.client.chat.postMessage({
                channel: '#test',
                // channel: '#proj-masterchef',
                text: `Please sign the transaction: https://bloks.io/msig/pancakeffect/${transactionName}
                \nTransaction ID: ${transaction.transaction_id}
                \nTransaction: ${JSON.stringify(transaction)}
                \nInfo: ${JSON.stringify(fileJson)}
                `
            }).catch(error => console.log(error));
        }

};


main()