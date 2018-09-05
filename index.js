/*
This script can download all recordings defined by call history filter
Downloaded files are in directories YYYY\MM\DD in working directory
*/

const rp = require('request-promise-native')
const mkdirp = require('mkdirp-promise')
const fs = require('fs')
const path = require('path')
const util = require('util')
const ProgressBar = require('progress')
const moment = require('moment')
const winston = require('winston')
const commander = require('commander')

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
const {dateFrom, dateTo} = commander
const apiParams = `startTime=${dateFrom}&endTime=${dateTo}`

/**
 * Creates options object for specific url 
 * @param uri
 * @params json
 * @returns Object 
 */
const createRequestOptions = (uri, json = false) => {
  const {apiKey, apiSecret} = commander
  return {
    uri,
    method: 'GET',
    auth: {
      'user': apiKey,
      'pass': apiSecret,
      sendImmediately: true
    },
    headers: {
      'Content-Type': 'application/json'
    },
    resolveWithFullResponse: true,
    json
  }
}

/**
 * Download list of records to be downloaded
 * @returns Array
 */
const getRecordsToDownload = async () => {
  const {host} = commander
  const requestOptions = createRequestOptions(
    `https://${host}/api/calls?${apiParams}`, 
    true
  )
  const {body} = await rp(requestOptions)
  return body.items.filter(row => row.filename.length > 0)
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
 * @param urlPath
 * @param fileName
 * @returns {Promise}
 */
const downloadFile = (urlPath, fileName) => {
  const {host} = commander

  return new Promise(async (resolve, reject) => {
    fileName = `downloads/${fileName.replace(/\*/gi, 'star')}`
    try {
      const requestOptions = createRequestOptions(`https://${host}${urlPath}`)
      const response = await rp(requestOptions)
      await prepareDirectory(fileName)
      const stream = fs
        .createWriteStream(fileName)
        .on('finish', resolve)
        .on('error', error => reject(error))
      response.pipe(stream)
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
  if (records.length === 0) {
    console.log('No records')
    return
  }

  console.log(`Number of records: ${records.length}`)
  const bar = new ProgressBar('Percent done :percent, estimated time :eta(s)', { total: records.length })

  for (const {linkedid, filename} of records) {
    try {
      await downloadFile(`/api/records/${linkedid}/stream`, filename)
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
