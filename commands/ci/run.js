const cli = require('heroku-cli-util')
const co = require('co')
const api = require('../../lib/heroku-api')
const CreateRun = require('../../lib/create-run')
const TestRun = require('../../lib/test-run')

function * run (context, heroku) {
  const coupling = yield api.pipelineCoupling(heroku, context.app)
  const pipeline = coupling.pipeline

  const commit = yield CreateRun.readCommit('HEAD')
  const source = yield cli.action('Uploading source', co(function * () {
    return yield CreateRun.prepareSource(commit.ref, context, heroku)
  }))

  const testRun = yield cli.action('Starting test run', co(function * () {
    return yield api.createTestRun(heroku, {
      commit_branch: commit.branch,
      commit_message: commit.message,
      commit_sha: commit.ref,
      pipeline: pipeline.id,
      source_blob_url: source.source_blob.get_url
    })
  }))

  return yield TestRun.displayAndExit(pipeline, testRun.number, { heroku })
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
