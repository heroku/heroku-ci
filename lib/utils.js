const api = require('./heroku-api')
const cli = require('heroku-cli-util')

function * getPipeline (context, client) {
  let pipeline = context.flags.pipeline

  let pipelineOrApp = pipeline || context.app
  if (!pipelineOrApp) cli.exit(1, 'Required flag:  --pipeline PIPELINE or --app APP')

  if (pipeline) {
    pipeline = yield api.pipelineInfo(client, pipeline)
  } else {
    const coupling = yield api.pipelineCoupling(client, context.app)
    pipeline = coupling.pipeline
  }

  return pipeline
}

module.exports = {
  getPipeline
}
