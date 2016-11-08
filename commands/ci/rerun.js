'use strict'
const cli = require('heroku-cli-util')
const co = require('co')
const api = require('../../lib/heroku-api')
const CreateRun = require('../../lib/create-run')
const TestRun = require('../../lib/test-run')

function * run (context, heroku) {
  const coupling = yield api.pipelineCoupling(heroku, context.app)
  const pipeline = coupling.pipeline

  let sourceTestRun

  if (context.args.number) {
    sourceTestRun = yield api.testRun(heroku, pipeline.id, context.args.number)

  } else {
    sourceTestRun = yield api.latestTestRun(heroku, pipeline.id)
  }

  const source = yield CreateRun.prepareSource(sourceTestRun.commit_sha, context, heroku)
  const testRun = yield api.createTestRun(heroku, {
    commit_branch: sourceTestRun.commit_branch,
    commit_message: sourceTestRun.commit_message,
    commit_sha: sourceTestRun.commit_sha,
    pipeline: pipeline.id,
    source_blob_url: source.source_blob.get_url
  })

  return yield TestRun.displayAndExit(pipeline, testRun.number, { heroku })
}

module.exports = {
  topic: 'ci',
  command: 'rerun',
  needsApp: true,
  needsAuth: true,
  description: 'rerun tests against current directory',
  help: 'uploads the contents of the current directory, using git archive, to Heroku and runs the tests',
  args: [{ name: 'number', optional: true }],
  run: cli.command(co.wrap(run))
}

