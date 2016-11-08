const cli = require('heroku-cli-util')
const wait = require('co-wait')
const ansiEscapes = require('ansi-escapes')
const api = require('./heroku-api')
const TestRun = require('./test-run')
const { PENDING, CREATING, BUILDING, RUNNING, ERRORED, FAILED, SUCCEEDED } = TestRun.STATES

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

function* watch (pipeline, { heroku }) {
  cli.styledHeader(`Watching test runs for the ${pipeline.name} pipeline`)

  let lastTestRunLength = null

  while (true) {
    const allTestRuns = yield api.testRuns(heroku, pipeline.id)
    const testRuns = allTestRuns.filter(isRunningOrRecent)

    if (lastTestRunLength) {
      process.stdout.write(ansiEscapes.eraseLines(lastTestRunLength + 1))
    }

    cli.table(testRuns.map((testRun) => columns(testRun, allTestRuns)), {
      printHeader: false
    })

    lastTestRunLength = testRuns.length

    yield wait(1000)
  }
}

function timeDiff (updatedAt, createdAt) {
  return (updatedAt.getTime() - createdAt.getTime()) / 1000
}

function averageTime (testRuns) {
  return testRuns.map((testRun) => timeDiff(new Date(testRun.updated_at), new Date(testRun.created_at))).reduce((a, b) => a + b, 0) / testRuns.length
}

function progressBar (testRun, allTestRuns, numBars = 100) {
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
