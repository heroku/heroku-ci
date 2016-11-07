const cli = require('heroku-cli-util')
const co = require('co')
const CreateRun = require('../../lib/create-run')
const TestRun = require('../../lib/test-run')

function * run (context, heroku) {
  let { number, pipeline } = yield CreateRun.uploadArchiveAndCreateRun(context, heroku)
  //TODO TestRun requires us to know the pipeline ID and name. Get that from
  //somewhere
  pipeline['name'] = 'sausages' //hardcoded for now
  return yield TestRun.displayAndExit(pipeline, number, { heroku })
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
