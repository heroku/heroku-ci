'use strict'
const cli = require('heroku-cli-util')
const co = require('co')
const CreateRun = require('../../lib/create-run')

function * rerun (context, heroku) {
  return yield CreateRun.uploadArchiveAndCreateRun(context, heroku)
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

