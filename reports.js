/*
This script can download all recordings defined by call history or queue filter
Downloaded files are in directories YYYY\MM\DD in working directory
*/

const axios = require('axios')
const mkdirp = require('mkdirp-promise')
const fs = require('fs')
const path = require('path')
const ProgressBar = require('progress')
const commander = require('commander')

const CENTRAL_API_URL = 'https://restapi.ipex.cz'
const IPBX_API_URL = 'https://ipbxapi.voipex.io'

commander
  .version('0.1.0')
  .option('-f, --date-from <value>', '(REQUIRED) from date i.e 2018-08-01')
  .option('-t, --date-to <value>', '(REQUIRED) to date i.e 2018-08-31')
  .option('-e, --email <value>', '(REQUIRED) Email ')
  .option('-p, --password <value>', `(REQUIRED) User's password `)
  .option('-d, --download', `Specify this argument if you want to download found recordings`)
  .option(
    '-q, --queues <value>',
    'Specify queue or queues for which should be recordings downloaded. In the case of multiple queues, separate their names with a comma e.g. Queue1,Queue2'
  )
  .parse(process.argv)

const validateArguments = (args) => {
  if (!process.argv.slice(2).length) {
    args.help()
  }

  if (!args.email) {
    throw new Error('--email required')
  }
  if (!args.password) {
    throw new Error('--password required')
  }

  if (!args.dateFrom || !args.dateTo) {
    throw new Error('Date is required')
  }
}

const getAuthToken = async(email, password) => {
  try {
    const response = await axios.post(`${CENTRAL_API_URL}/v1/sso/login`, {
      email,
      password
    })
    return response.data.access_token
  } catch (error) {
    if (error.response && error.response.status === 401) {
      throw new Error('Wrong username or password')
    }
    throw error
  }
}

const getPbxId = async(token) => {
  const { data } = await axios.get(`${CENTRAL_API_URL}/v1/users/me`, {
    headers: {
      authorization: `Bearer ${token}`
    }
  })
  const pbxService = data.services.find(({ type }) => type === 'pbx')

  if (!pbxService) {
    throw new Error('User has no PBX assigned')
  }

  return pbxService.properties.pbxId
}

const parseQueuesArgToQuery = () => {
  if (commander.queues) {
    const queues = commander.queues.split(',').map((queue) => queue.trim())
    return JSON.stringify(queues)
  } else {
    return undefined
  }
}

const prepareDirectory = (filename) => {
  const dir = path.dirname(filename)
  try {
    fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK)
  } catch (error) {
    return mkdirp(dir)
  }
}

const getCallList = async(token) => {
  const calls = await axios({
    method: 'GET',
    baseURL: IPBX_API_URL,
    url: 'reports/calls',
    params: {
      startTime: commander.dateFrom,
      endTime: commander.dateTo,
      queues: parseQueuesArgToQuery()
    },
    headers: {
      authorization: `Bearer ${token}`
    }
  })

  return calls.data.filter(call => !!call.recording)
}

const downloadRecording = (filename, authToken, pbxId) =>
  new Promise(async(resolve, reject) => {
    const destinationFilename = `downloads/${filename.replace(/\*/gi, 'star')}`
    try {
      const response = await axios({
        baseURL: IPBX_API_URL,
        url: `recordings/${encodeURIComponent(filename)}/ipbx/${pbxId}`,
        responseType: 'stream',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      })

      await prepareDirectory(destinationFilename)
      const stream = fs.createWriteStream(destinationFilename)
        .on('finish', resolve)
        .on('error', reject)

      response.data.pipe(stream)
    } catch (error) {
      reject(error)
    }
  })

const downloadRecordings = async(calls, authToken, pbxId) => {
  console.log(`Found ${calls.length} calls with recording`)
  const bar = new ProgressBar(
    'Downloading files. Percent done :percent, estimated time :eta(s)',
    { total: calls.length }
  )
  for (const { recording } of calls) {
    try {
      await downloadRecording(recording, authToken, pbxId)
      console.log(`File ${recording} successfully downloaded`)
    } catch (error) {
      console.error(
        `File ${recording} could not be downloaded because "${error.message}"`
      )
    } finally {
      bar.tick()
    }
  }
}

const calculateRecordings = (calls) => {
  const sum = calls.reduce((acc, call) => {
    acc += call.duration
    console.log(call.recording)
    return acc
  }, 0)
  console.log(`Found ${calls.length} calls with recording with total duration of ${(sum / 60).toFixed(1)} minutes`)
}

(async() => {
  try {
    validateArguments(commander)
    const authToken = await getAuthToken(commander.email, commander.password)
    const pbxId = await getPbxId(authToken)
    const calls = await getCallList(authToken)
    if (calls.length === 0) {
      console.log('No calls found for specified filter')
      return
    }

    if (commander.download) {
      await downloadRecordings(calls, authToken, pbxId)
    } else {
      calculateRecordings(calls)
    }
  } catch (error) {
    console.log(error.message)
    process.exit(1)
  }
})()
