const log = require('single-line-log').stdout
const TestRun = require('./test-run')
const cli = require('heroku-cli-util')

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

function statusIcon ({ status }) {
  return cli.color[STATUS_COLORS[status]](STATUS_ICONS[status])
}

function printLine (testRun) {
  return `${statusIcon(testRun)} #${testRun.number} ${testRun.commit_branch}:${testRun.commit_sha.slice(0, 6)} ${testRun.status}`
}

function limit (testRuns, count) {
  return testRuns.slice(0, count)
}

function sort (testRuns) {
  return testRuns.sort((a, b) => a.number < b.number ? 1 : -1)
}

function render (testRuns, count = 15) {
  const arranged = limit(sort(testRuns), count)
  return log(arranged.map(printLine).join('\n'))
}

module.exports = {
  render
}
