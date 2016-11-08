'use strict'
const cli = require('heroku-cli-util')
const co = require('co')
const api = require('../../lib/heroku-api')
const CreateRun = require('../../lib/create-run')
const TestRun = require('../../lib/test-run')

function * run (context, heroku) {
  const coupling = yield api.pipelineCoupling(heroku, context.app)
  const pipeline = coupling.pipeline
  let { number }  = yield CreateRun.uploadArchiveAndCreateRun(pipeline, context, heroku)
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
  run: cli.command(co.wrap(run))
}

