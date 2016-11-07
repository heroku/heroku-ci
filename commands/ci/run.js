const cli = require('heroku-cli-util')
const co = require('co')
const CreateRun = require('../../lib/create-run')

function * run (context, heroku) {
  return yield CreateRun.uploadArchiveAndCreateRun(context, heroku)
}

module.exports = {
  topic: 'ci',
  command: 'run',
  needsApp: true,
  needsAuth: true,
  description: 'run tests against current directory',
  help: 'uploads the contents of the current directory, using git archive, to Heroku and runs the tests',
  run: cli.command(co.wrap(run))
}
