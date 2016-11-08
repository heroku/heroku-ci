const cli = require('heroku-cli-util')
const log = require('single-line-log').stdout
const io = require('socket.io-client')
const api = require('./heroku-api')
const TestRun = require('./test-run')
const SingleLineLog = require('./single-line-log')

const SIMI = 'https://simi-production.herokuapp.com'

function isRunningOrRecent (testRun) {
  return TestRun.isNotTerminal(testRun) || TestRun.isRecent(testRun)
}

function* getRunningTests (heroku, pipelineID) {
  return (yield api.testRuns(heroku, pipelineID)).filter(isRunningOrRecent)
}

function handleTestRunEvent (newTestRun, testRuns) {
  const previousTestRun = testRuns.find(({ id }) => id === newTestRun.id)
  if (previousTestRun) {
    const previousTestRunIndex = testRuns.indexOf(previousTestRun)
    testRuns.splice(previousTestRunIndex, 1)
  }

  testRuns.push(newTestRun)

  return testRuns
}

function render(testRuns) {
  yield SingleLineLog.render(testRuns)
}

function* watch (pipeline, { heroku }) {
  cli.styledHeader(`Watching test runs for the ${pipeline.name} pipeline`)

  let testRuns = yield getRunningTests(heroku, pipeline.id)

  render(testRuns)

  const socket = io(SIMI, { transports: ['websocket'], upgrade: false })

  socket.on('connect', () => {
    socket.emit('joinRoom', {
      room: `pipelines/${pipeline.id}/test-runs`,
      token: heroku.options.token
    })
  })

  socket.on('create', ({ resource, data }) => {
    if (resource === 'test-run') {
      testRuns = handleTestRunEvent(data, testRuns)
      render(testRuns)
    }
  })

  socket.on('update', ({ resource, data }) => {
    if (resource === 'test-run') {
      testRuns = handleTestRunEvent(data, testRuns)
      render(testRuns)
    }
  })
}

module.exports = {
  watch
}
