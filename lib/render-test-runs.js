const cli = require('heroku-cli-util')
const io = require('socket.io-client')
const api = require('./heroku-api')
const TestRun = require('./test-run')
const SingleLineLog = require('./single-line-log')

const SIMI = 'https://simi-production.herokuapp.com'

function handleTestRunEvent (newTestRun, testRuns) {
  const previousTestRun = testRuns.find(({ id }) => id === newTestRun.id)
  if (previousTestRun) {
    const previousTestRunIndex = testRuns.indexOf(previousTestRun)
    testRuns.splice(previousTestRunIndex, 1)
  }

  testRuns.push(newTestRun)

  return testRuns
}

function redraw (testRuns) {
  return
}

function* render (pipeline, { heroku, watch }) {
  cli.styledHeader(
    `${watch ? 'Watching' : 'Showing'} latest test runs for the ${pipeline.name} pipeline`
  )

  let testRuns = yield api.testRuns(heroku, pipeline.id)

  SingleLineLog.render(testRuns)

  if (!watch) {
    return
  }

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
      SingleLineLog.render(testRuns)
    }
  })

  socket.on('update', ({ resource, data }) => {
    if (resource === 'test-run') {
      testRuns = handleTestRunEvent(data, testRuns)
      SingleLineLog.render(testRuns)
    }
  })
}

module.exports = {
  render
}
