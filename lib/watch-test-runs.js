const cli = require('heroku-cli-util')
const wait = require('co-wait')
const log = require('single-line-log').stdout
const api = require('./heroku-api')
const TestRun = require('./test-run')
const { PENDING, CREATING, BUILDING, RUNNING, ERRORED, FAILED, SUCCEEDED } = TestRun.STATES

const STATUS_ICONS = {
  [PENDING]: '⋯',
  [CREATING]: '⋯',
  [BUILDING]: '⋯',
  [RUNNING]: '⋯',
  [ERRORED]: '!',
  [FAILED]: '𐄂',
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

function* getRunningTests (heroku, pipelineID) {
  return (yield api.testRuns(heroku, pipelineID)).filter(isRunningOrRecent)
}

function statusIcon ({ status }) {
  return cli.color[STATUS_COLORS[status]](STATUS_ICONS[status])
}

function printLine (testRun) {
  return `${statusIcon(testRun)} #${testRun.number} ${testRun.commit_branch}:${testRun.commit_sha.slice(0, 6)} ${testRun.status}`
}

function* watch (pipeline, { heroku }) {
  cli.styledHeader(`Watching test runs for the ${pipeline.name} pipeline`)
  while (true) {
    const testRuns = yield getRunningTests(heroku, pipeline.id)
    log(testRuns.map(printLine).join('\n'))
    yield wait(1000)
  }
}

module.exports = {
  watch
}
