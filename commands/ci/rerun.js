'use strict'
const cli = require('heroku-cli-util')
const co = require('co')
const CreateRun = require('../../lib/create-run')
const TestRun = require('../../lib/test-run')

function * rerun (context, heroku) {
  let { number, pipeline } = yield CreateRun.uploadArchiveAndCreateRun(context, heroku)
  pipeline['name'] = 'sausages' // hardcoded for now
  return yield TestRun.displayAndExit(pipeline, number, { heroku })
}

module.exports = {
  topic: 'ci',
  command: 'rerun',
  needsApp: true,
  needsAuth: true,
  description: 'rerun tests against current directory',
  help: 'uploads the contents of the current directory, using git archive, to Heroku and runs the tests',
  args: [{ name: 'branch', optional: true }],
  run: cli.command(co.wrap(rerun))
}

