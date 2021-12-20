const fs = require('fs')
const path = require('path')

const writeToDisk = (name, data) => {
    try {
        const jsonFileName = `${name}_${Date.now()}.json`
        fs.writeFileSync(path.join(__dirname, `../data/${jsonFileName}`), JSON.stringify(data, null, 2))
        console.log(`📄 Saved to ${jsonFileName}`)
    } catch (error) {
        console.error()
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
    <style>
      table { border-collapse: collapse; margin: 25px 0; font-size: 0.9em; font-family: sans-serif; min-width: 400px; box-shadow: 0 0 20px rgba(0, 0, 0, 0.15); margin: 0 auto; }
      thead tr { background-color: #101D56; color: #ffffff; text-align: left; }
      th, td { padding: 12px 15px; }
      tbody tr { border-bottom: 1px solid #dddddd; }
      tbody tr:nth-of-type(even) { background-color: #f3f3f3; }
      tbody tr:last-of-type { border-bottom: 2px solid #101D56; }
      #logo { width: 12em; display: block; margin: 2em auto; }
      p { max-width: 500px; margin: 2em auto; font-family: "Inter",sans-serif; color: #363636; font-size: 16px; font-weight: 400; line-height: 1.7; text-align: center; }
    </style>
  </head>
  <body>
    <img id="logo" src="https://effect.network/_nuxt/img/effect-dao_h100.62b6528.png" />

    <p>The Effect Network Foundation transfers it's fees earned from the EFX
    PancakeSwap pool to EffectDAO. It is sent
    to the <a href="https://bloks.io/account/feepool.efx">DAO feepool</a>. See the table below for details.</p>

    <table>
        <thead>
          <tr><th colspan="2">PancakeSwap Fees Summary</th></tr>
        </thead>
        <tbody>

            <tr>
                <td>Latest Update</td>
                <td>${data.latestUpdateDateTime}</td>
            </tr>

            <tr>
                <td>Total swaps</td>
                <td>${data.totalSwaps}</td>
            </tr>

            <tr>
                <td><b>Total fees for DAO in EFX</b></td>
                <td><b>${parseFloat(data.foundationTotal_EFX).toFixed(2)}</b></td>
            </tr>

            <tr>
                <td><b>Total EFX Swapped</b></td>
                <td><b>${parseFloat(data.totalTransactions_EFX).toFixed(2)}</b></td>
            </tr>

            <tr>
                <td><i>Total Swaps</i></td>
                <td>${data.totalSwaps}</td>
            </tr>

            <tr>
                <td><i>Average EFX per Swap</i></td>
                <td>${parseFloat(data.averageEfxFeePerSwap).toFixed(2)}</td>
            </tr>

            <tr>
                <td><i>Average Ratio</i></td>
                <td>${parseInt(data.averageRatio)}</td>
            </tr>
            
            <tr>
                <td><i>Start Block</i></td>
                <td><a href="https://bscscan.com/block/${data.startBlock}">${data.startBlock}</a></td>
            </tr>

            <tr>
                <td><i>Start Block TimeStamp</i></td>
                <td>${data.startBlockDateTime}</td>
            </tr>


            <tr>
                <td><i>End Block</i></td>
                <td><a href="https://bscscan.com/block/${data.endBlock}">${data.endBlock}</a></td>
            </tr>

            <tr>
                <td><i>End Block TimeStamp</i></td>
                <td>${data.endBlockDateTime}</td>
            </tr>

            <tr>
                <td><i>Foundation Balance (Cake-LP)</i></td>
                <td>${parseFloat(data.foundationBalanceEnd_CakeLP).toFixed(2)}</td>
            </tr>

            <tr>
                <td><i>Total Supply (Cake-LP)</i></td>
                <td>${parseFloat(data.totalSupplyEnd_CakeLP).toFixed(2)}</td>
            </tr>            

        </tbody>
    </table>
    <p><a href="https://github.com/effectai/dao-pancake-fees">view source</a></p>
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
