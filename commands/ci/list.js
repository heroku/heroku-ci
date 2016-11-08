const cli = require('heroku-cli-util')
const co = require('co')
const api = require('../../lib/heroku-api')
const SingleLineLog = require('../../lib/single-line-log')

function* run (context, heroku) {
  const coupling = yield api.pipelineCoupling(heroku, context.app)
  const pipelineID = coupling.pipeline.id
  const runs = yield api.testRuns(heroku, pipelineID)

  return SingleLineLog.render(runs)
}

module.exports = {
  topic: 'ci',
  command: 'list',
  default: true,
  needsApp: true,
  needsAuth: true,
  description: 'show the the most recent runs',
  help: 'display the most recent CI runs for the given pipeline',
  run: cli.command(co.wrap(run))
}
