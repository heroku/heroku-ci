const api = require('./heroku-api')
const simi = require('./simi-api')
const cli = require('heroku-cli-util')

const PENDING = 'pending'
const CREATING = 'creating'
const BUILDING = 'building'
const RUNNING = 'running'
const ERRORED = 'errored'
const FAILED = 'failed'
const SUCCEEDED = 'succeeded'
const TERMINAL_STATES = [SUCCEEDED, FAILED, ERRORED]

function isTerminal (testRun) {
  return TERMINAL_STATES.includes(testRun.status)
}

function stream (url) {
  return new Promise((resolve, reject) => {
    const output = api.logStream(url)

    output.on('data', (data) => {
      if (data.toString() === new Buffer('\0').toString()) {
        output.emit('close')
      }
    })
    const pipe = output.pipe(process.stdout)

    output.on('close', () => {
      output.end && output.end()
      output.close && output.close()
      resolve()
    })
  })
}
function* subscribe (testRun, { heroku }) {
  const setup = yield stream(testRun.setup_stream_url)
  const run = yield stream(testRun.output_stream_url)

  return testRun

  // return new Promise((resolve, reject) => {

  //   if (isTerminal(testRun)) {
  //     resolve(testRun)
  //   }
  //
  //   const socket = simi.connect()
  //
  //   socket.on('connect', () => {
  //     socket.emit('joinRoom', {
  //       room: `test-runs/${testRun.id}`,
  //       token: heroku.options.token
  //     })
  //   })
  //
  //   socket.on('event', ({ resource, data }) => {
  //     console.log(resource, data)
  //     if (resource !== 'test-run') return
  //
  //     testRun = resource
  //
  //     if (resource.status !== testRun.status) {
  //       onStatusChage(testRun)
  //     }
  //
  //     if (isTerminal(testRun)) {
  //       resolve(testRun)
  //     }
  //   })
  // })
}

function* display (pipeline, number, { heroku }) {
  cli.styledHeader(`Test run #${number}\n`)

  let testRun = yield api.testRun(heroku, pipeline.id, number)

  testRun = yield subscribe(testRun, { heroku })

  const repo = yield api.pipelineRepository(heroku, pipeline.id)

  cli.log(/* newline 💃 */)
  cli.styledHash({
    pipeline: pipeline.name,
    repo: repo.repository.name,
    status: testRun.status,
    commit: `[${testRun.commit_sha.slice(0, 6)}] ${testRun.commit_message}`,
    branch: testRun.commit_branch
  })

  return testRun
}

module.exports = {
  isTerminal,
  display
}
