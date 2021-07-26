const IPFS = require('ipfs-core')
const fs = require('fs')
const path = require('path')
const jsPDF = require('jspdf')


const writeToDisk = (name, argv, data) => {
    if (argv.json) {
        try {
            const jsonFileName = `${name}_${Date.now()}.json`
            fs.writeFileSync(path.join(__dirname, `/data/${jsonFileName}`), JSON.stringify(data, null, 2))
            console.log(`📄 Saved to ${jsonFileName}`)            
        } catch (error) {
            console.error()
        }
    }
    
    if (argv.csv) {
        const csvFileName = `${name}_${Date.now()}.csv`
        try {
            const csv = papaparse.unparse(data)
            fs.writeFileSync(path.join(__dirname, `/data/${csvFileName}`), csv)
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
        ${JSON.stringify(data, null, 2)}
        <script src="js/scripts.js"></script>
        </body>
        </html>
    `
    fs.writeFileSync(path.join(__dirname, `${htmlFileName}`), html)
    console.log(`📄 Saved to ${htmlFileName}`)
}

module.exports = {
    writeToDisk,
    createHTML
}