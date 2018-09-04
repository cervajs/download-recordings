/*
This script can download all recordings defined by call history filter
Downloaded files are in directories YYYY\MM\DD in working directory
*/

const config = require('./config')
const rp = require('request-promise')
const mkdirp = require('mkdirp-promise')
const fs = require('fs')
const path = require('path')
const util = require('util')
const fsAccess = util.promisify(fs.access)
const ProgressBar = require('progress')
const moment = require('moment')

/**
 * @type {string} https://ipbx.docs.apiary.io/#reference/calls/calls/get-call-history
 */
// 6 months back
const apiParams = 'startTime=' + moment().subtract(6, 'months').format() + '&endTime=' + moment().format()
//const apiParams = 'startTime=2018-08-01&endTime=2018-08-31'


// get calls history options
const options = {
  uri: 'https://' + config.host + '/api/calls?' + apiParams,
  method: 'GET',
  auth: {
    'user': config.apiKey,
    'pass': config.apiSecret
  },
  headers: {
    'Content-Type': 'application/json'
  }
}

/**
 * Function for recordings download
 * @param urlPath
 * @param fileName
 * @returns {Promise}
 */
const downloadFile = (urlPath, fileName) => {
  return new Promise(resolve => {
    let url = 'https://' + config.host + urlPath
    fileName = fileName.replace(/\*/gi, 'star')
    let stream = fs.createWriteStream(fileName)
    stream.on('finish', resolve)
    rp({
      method: 'GET',
      url: url,
      auth: {
        user: config.apiKey,
        pass: config.apiSecret,
        sendImmediately: true
      },
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(stream)
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
  const cdrReqResult = await rp(options)
  let cdrRows = JSON.parse(cdrReqResult).items.filter(row => row.filename.length > 0)
  if (cdrRows.length === 0) {
    console.log('No records')
    return
  }

  console.log(`number of records: ${cdrRows.length}`)

  let bar = new ProgressBar('percent done :percent, estimated time :eta(s)', { total: cdrRows.length })

  for (const row of cdrRows) {
    await prepareDirectory(row.filename)
    await downloadFile('/api/records/' + row.linkedid + '/stream', row.filename)
    bar.tick()
  }
  console.log('DONE')
}

run()
  .catch(err => {
    console.log(`${err}`)
  })
