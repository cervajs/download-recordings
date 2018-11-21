/*
This script can download all recordings defined by call history filter
Downloaded files are in directories YYYY\MM\DD in working directory
*/

const axios = require('axios')
const mkdirp = require('mkdirp-promise')
const fs = require('fs')
const path = require('path')
const ProgressBar = require('progress')
const winston = require('winston')
const commander = require('commander')
const qs = require('querystring')

commander
  .version('0.1.0')
  .option('-f, --date-from <value>', 'from date i.e 2018-08-01')
  .option('-t, --date-to <value>', 'to date i.e 2018-08-31')
  .option('-h, --host <value>', '(REQUIRED) PBX name ')
  .option('-k, --api-key <value>', '(REQUIRED) API key ')
  .option('-s, --api-secret <value>', '(REQUIRED) API key secret ')
  .parse(process.argv)

  if (!process.argv.slice(2).length) {
    commander.help();
  }
  
  if (!commander.host) {
    console.log('--host required');
    process.exit(0);
  }
  if (!commander.apiKey) {
    console.log('--api-key required');
    process.exit(0);
  }
  
  if (!commander.apiSecret) {
    console.log('--api-secret required');
    process.exit(0);
  }
  
  if (!commander.dateFrom || !commander.dateTo ) {
    console.log('Date is required');
    process.exit(0);
  }

/**
 * @type {string} https://ipbx.docs.apiary.io/#reference/calls/calls/get-call-history
 */
// 6 months back
// const apiParams = 'startTime=' + moment().subtract(6, 'months').format() + '&endTime=' + moment().format()

// Read date interval from args
const pageSize = '50'
const {dateFrom, dateTo} = commander
const apiParams = `startTime=${dateFrom}&endTime=${dateTo}&pageSize=${pageSize}&page=`

/**
 * Creates options object for specific url 
 * @param url
 * @params responseType
 * @returns Object 
 */
const createRequestOptions = (url, responseType = 'json') => {
  const {apiKey, apiSecret} = commander
  return {
    url,
    auth: {
      username: apiKey,
      password: apiSecret
    },
    responseType
  }
}

/**
 * Get pages count from last link
 * @param data
 * @returns {number}
 */
const getLastPage = data => {
    if (data.links.length) {
        const lastLink = data.links.filter(link => link.rel === 'last')[0]
        if (lastLink) {
            const {page} = qs.parse(lastLink.href.split("?")[1])
            return parseInt(page)
        }
    }
    return 1
}

/**
 * Download list of records to be downloaded
 * @returns {Promise<Set<any>>}
 */
const getRecordsToDownload = async () => {
  const {host} = commander
  const requestOptions = createRequestOptions(
    `https://${host}/api/calls?${apiParams}`, 
  )
    const prospecting  = await axios(requestOptions)
    const pagesCount = getLastPage(prospecting.data)
    const bar = new ProgressBar('Retrieving cdr data from the iPBX. Percent done :percent, estimated time :eta(s)', { total: pagesCount })
    let nexPage = true
    let page = 1
    const records = []
    while (nexPage) {
        const newRequestOpt = {...requestOptions}
        newRequestOpt.url += `${page}`
        const {data} = await axios(newRequestOpt)
        records.push(...data.items)
        ++page
        bar.tick()
        nexPage = data.links.length && data.links.filter(link => link.rel === 'next')
    }
  return new Set(records.filter(row => row.filename.length > 0).map(row => row.filename))
}

const logger = winston.createLogger({
  transports: [
    // For development purposes you can use console, but it will break progress
    // new winston.transports.Console(),
    new winston.transports.File({
      filename: 'download.log',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD hh:mm:ss A ZZ'
        }),
        winston.format.json()
      ),
      handleExceptions: true
    })
  ]
});

/**
 * Download concrete record
 * @param fileName
 * @returns {Promise}
 */
const downloadFile = (fileName) => {
  const {host} = commander

  return new Promise(async (resolve, reject) => {
    const destinationFileName = `downloads/${fileName.replace(/\*/gi, 'star')}`
    let path = `https://${host}/api/records/${encodeURIComponent(fileName)}/stream`
    try {
      const requestOptions = createRequestOptions(path, 'stream')
      const response = await axios(requestOptions)  

      if (response.status >= 200 && response.status < 300) {
        await prepareDirectory(destinationFileName)
        const stream = fs
          .createWriteStream(destinationFileName)
          .on('finish', resolve)
          .on('error', error => reject(error))
        response.data.pipe(stream)  
      } else {
        reject(response.statusMessage)
      }      
    } catch (e) {
      reject(e.message)
    }
  })
}

/**
 * Creates a directory by filename if it does not exist
 * @param filename
 * @returns {Promise<void>}
 */
const prepareDirectory = async (filename) => {
  const dir = path.dirname(filename)
  try {
    await fsAccess(dir, fs.constants.R_OK | fs.constants.W_OK)
  } catch (e) {
    return mkdirp(dir)
  }
}

const run = async () => {
  const records = await getRecordsToDownload()
  if (records.size === 0) {
    console.log('No records')
    return
  }

  console.log(`Number of records: ${records.size}`)
  const bar = new ProgressBar('Downloading files. Percent done :percent, estimated time :eta(s)', { total: records.size })

  for (const filename of records) {
    try {
      await downloadFile(filename)
      logger.info(`File ${filename} successfully downloaded`)
    } catch (e) {
      logger.error(`File ${filename} could not be downloaded because "${e}"`)
    } finally {
      bar.tick()
    }
  }
  console.log('DONE!')
}

try {
  run()
} catch(err) {
  logger.error(`${err}`)
}
