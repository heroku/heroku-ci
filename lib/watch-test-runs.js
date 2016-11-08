const cli = require('heroku-cli-util')
const io = require('socket.io-client')
const ansiEscapes = require('ansi-escapes')
const api = require('./heroku-api')
const TestRun = require('./test-run')
const wait = require('co-wait')

const SIMI = 'https://simi-production.herokuapp.com'
const { PENDING, CREATING, BUILDING, RUNNING, ERRORED, FAILED, SUCCEEDED } = TestRun.STATES

// used to pad the status column so that the progress bars align
const maxStateLength = Math.max.apply(null, Object.keys(TestRun.STATES).map((k) => TestRun.STATES[k]))

const STATUS_ICONS = {
  [PENDING]: '⋯',
  [CREATING]: '⋯',
  [BUILDING]: '⋯',
  [RUNNING]: '⋯',
  [ERRORED]: '!',
  [FAILED]: '✗',
  [SUCCEEDED]: '✓'
}

const STATUS_COLORS = {
  [PENDING]: 'yellow',
  [CREATING]: 'yellow',
  [BUILDING]: 'yellow',
  [RUNNING]: 'yellow',
  [ERRORED]: 'red',
  [FAILED]: 'red',
  [SUCCEEDED]: 'green'
}

function isRunningOrRecent (testRun) {
  return TestRun.isNotTerminal(testRun) || TestRun.isRecent(testRun)
}

function statusIcon ({ status }) {
  return cli.color[STATUS_COLORS[status]](STATUS_ICONS[status])
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

function render (testRuns) {
  process.stdout.write(ansiEscapes.eraseDown)

  const sorted = testRuns.filter(isRunningOrRecent).sort((a, b) => a.number < b.number ? 1 : -1)
  cli.table(sorted.map((testRun) => columns(testRun, testRuns)), {
    printHeader: false
  })

  process.stdout.write(ansiEscapes.cursorUp(sorted.length))
}

function* watch (pipeline, { heroku }) {
  cli.styledHeader(`Watching test runs for the ${pipeline.name} pipeline`)

  let testRuns = yield api.testRuns(heroku, pipeline.id)

  process.stdout.write(ansiEscapes.cursorHide)

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

  // refresh the table every second for progress bar updates
  while (true) {
    yield wait(1000)
    render(testRuns)
  }
}

function timeDiff (updatedAt, createdAt) {
  return (updatedAt.getTime() - createdAt.getTime()) / 1000
}

function averageTime (testRuns) {
  return testRuns.map((testRun) => timeDiff(new Date(testRun.updated_at), new Date(testRun.created_at))).reduce((a, b) => a + b, 0) / testRuns.length
}

function progressBar (testRun, allTestRuns, numBars = 100) {
  // only include the last X runs which have finished
  const numRuns = 10
  const terminalRuns = allTestRuns.filter(TestRun.isTerminal).slice(0, numRuns)

  if (TestRun.isTerminal(testRun) || terminalRuns.length === 0) {
    return ''
  }

  const avg = averageTime(terminalRuns)
  const testRunElapsed = timeDiff(new Date(), new Date(testRun.created_at))
  const percentageComplete = Math.min(Math.floor((testRunElapsed / avg) * numBars), numBars)
  return `[${'='.repeat(percentageComplete)}${' '.repeat(numBars - percentageComplete)}]`
}

function padStatus (testStatus) {
  return testStatus + ' '.repeat(Math.max(0, maxStateLength - testStatus.length))
}

function columns (testRun, allTestRuns) {
  return [statusIcon(testRun), testRun.number, testRun.commit_branch, testRun.commit_sha.slice(0, 6), padStatus(testRun.status), progressBar(testRun, allTestRuns)]
}

module.exports = {
  watch
}
