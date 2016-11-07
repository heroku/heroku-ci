const api = require('./heroku-api')
const simi = require('./simi-api')
const cli = require('heroku-cli-util')
const wait = require('co-wait')

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

function* waitForTerminal (testRun, { heroku }) {
  while (!isTerminal(testRun)) {
    testRun = yield api.testRun(heroku, testRun.pipeline.id, testRun.number)
    yield wait(1000)
  }
  return testRun
}

function stream (url) {
  return new Promise((resolve, reject) => {
    const request = api.logStream(url, (output) => {
      output.on('data', (data) => {
        if (data.toString() === new Buffer('\0').toString()) {
          request.abort()
          resolve()
        }
      })

      output.on('end', () => resolve())

      output.on('error', (e) => reject(e))

      output.pipe(process.stdout)
    })
  })
}

function* display (pipeline, number, { heroku }) {
  cli.styledHeader(`Test run #${number} setup\n`)

  let testRun = yield api.testRun(heroku, pipeline.id, number)

  const setup = yield stream(testRun.setup_stream_url)

  cli.styledHeader(`Test run #${number} output\n`)

  const run = yield stream(testRun.output_stream_url)

  cli.styledHeader(`Test run #${number} status\n`)

  testRun = yield waitForTerminal(testRun, { heroku })

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

function* displayAndExit (pipeline, number, { heroku }) {
  let testRun = yield display(pipeline, number, { heroku })
  process.exit(testRun.exit_code)
}

module.exports = {
  isTerminal,
  display,
  displayAndExit
}
