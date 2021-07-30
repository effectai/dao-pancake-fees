const fs = require('fs')
const path = require('path')
const papaparse = require('papaparse')

const writeToDisk = (name, argv, data) => {
    if (argv.json) {
        try {
            const jsonFileName = `${name}_${Date.now()}.json`
            fs.writeFileSync(path.join(__dirname, `../data/${jsonFileName}`), JSON.stringify(data, null, 2))
            console.log(`📄 Saved to ${jsonFileName}`)            
        } catch (error) {
            console.error()
        }
    }
    
    if (argv.csv) {
        const csvFileName = `${name}_${Date.now()}.csv`
        try {
            const csv = papaparse.unparse(data)
            fs.writeFileSync(path.join(__dirname, `../data/${csvFileName}`), csv)
            console.log(`📄 Saved to ${csvFileName}`)
        } catch (error) {
            console.error(error)
        }
    }
}

/**
 * Create a pdf file with the given data and optionally publish it to IPFS and save to disk
 * @param {object} data - The data to be converted to a PDF
 * @param {boolean} toDisk - Whether to save the PDF to disk
 * @param {boolean} toIpfs - Whether to publish the PDF to IPFS
 */
const createHTML = (data) => {
    const htmlFileName = `efx_pcs_lp_swaps_${Date.now()}.html`
    const html = `
    <!doctype html>
        <html lang="en">
        <head>
        <meta charset="utf-8">
        <title>Dao Pancake-Liquidity Fee</title>
        <meta name="" content="Starter Template">
        <meta name="Effect.Network" content="Effect Network">
        <link rel="stylesheet" href="css/styles.css?v=1.0">
        <!--[if lt IE 9]>
        <script src="http://html5shiv.googlecode.com/svn/trunk/html5.js"></script>
        <![endif]-->
        </head>
        <body>
        <table>
            <thead>
                <tr>
                    <th>DAO Pancake Liquidity Fees</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Total Swaps</td>
                    <td>${data.totalSwaps}</td>
                </tr>
                <tr>
                    <td>Total EFX Swaps</td>
                    <td>${data.totalEfxSwaps}</td>
                <tr>
                    <td>EFX%</td>
                    <td>${data.efxPercentage}%</td>            
                </tr>
                <tr>
                    <td>Total WBNB Swaps</td>
                    <td>${data.totalWbnbSwaps}</td>
                </tr>
                <tr>
                    <td>WBNB%</td>
                    <td>${data.wbnbPercentage}%</td>
                </tr>
                <tr>
                    <td>Total EFX Fees</td>
                    <td>${data.totalEFXFees}</td>
                </tr>
                <tr>
                    <td>Total WBNB Fees</td>
                    <td>${data.totalWBNBFees}</td>
                </tr>
                <tr>
                    <td>Avg EFX Fee/Swap</td>
                    <td>${data.averageEFXFeesPerSwap}</td>
                </tr>
                <tr>
                    <td>Avg WBNB Fee/Swap</td>
                    <td>${data.averageWBNBFeesPerSwap}</td>
                </tr>
                <tr>
                    <td>Min Swap Fee EFX</td>
                    <td>${data.minSwapEfx}</td>
                </tr>
                <tr>
                    <td>Max Swap Fee WBNB</td>
                    <td>${data.maxSwapEfx}</td>
                </tr>
                <tr>
                    <td>Min Swap Fee WBNB</td>
                    <td>${data.minSwapWBNB}</td>
                </tr>
                <tr>
                    <td>Max Swap Fee WBN</td>
                    <td>${data.maxSwapWBNB}</td>
                </tr>

            </tbody>
        </table>
        <script src="js/scripts.js"></script>
        </body>
        </html>
    `
    fs.writeFileSync(path.join(__dirname, `../${htmlFileName}`), html)
    console.log(`📄 Saved to ${htmlFileName}`)
}

module.exports = {
    writeToDisk,
    createHTML
}