const cli = require('heroku-cli-util')
const Dyno = require('heroku-run').Dyno
const co = require('co')
const api = require('../../lib/heroku-api')
const git = require('../../lib/git')
const source = require('../../lib/source')
const TestRun = require('../../lib/test-run')

// Default command. Run setup, source profile.d scripts and open a bash session
const COMMAND = 'sprettur setup && for f in .profile.d/*; do source $f; done && bash'

function* run (context, heroku) {
  const coupling = yield api.pipelineCoupling(heroku, context.app)
  const pipeline = coupling.pipeline
  const commit = yield git.readCommit('HEAD')
  const sourceBlobUrl = yield cli.action('Preparing source', co(function* () {
    return yield source.createSourceBlob(commit.ref, context, heroku)
  }))

  const pipelineRepository = yield api.pipelineRepository(heroku, pipeline.id)
  const organization = pipelineRepository.organization &&
                       pipelineRepository.organization.name

  let testRun = yield cli.action('Creating test run', co(function* () {
    return yield api.createTestRun(heroku, {
      commit_branch: commit.branch,
      commit_message: commit.message,
      commit_sha: commit.ref,
      pipeline: pipeline.id,
      organization,
      source_blob_url: sourceBlobUrl,
      debug: true
    })
  }))

  testRun = yield TestRun.waitForStates(['debugging', 'errored'], testRun, { heroku })

  if (testRun.status === 'errored') {
    cli.exit(1, `Test run creation failed whilst ${testRun.error_state} with message "${testRun.message}"`)
  }

  const appSetup = yield api.appSetup(heroku, testRun.app_setup.id)

  const dyno = new Dyno({
    heroku,
    app: appSetup.app.id,
    command: context.flags['no-setup'] ? 'bash' : COMMAND,
    'exit-code': true,
    'no-tty': context.flags['no-tty'],
    attach: true,
    env: 'HEROKU_SUPPRESS_LOGGING=true',
    showStatus: false
  })

  try {
    cli.log('Running setup and attaching to test dyno...')
    dyno.start()
  } catch (err) {
    if (err.exitCode) cli.exit(err.exitCode, err)
    else throw err
  }

  // TODO: uncomment when this endpoint is deployed
  // yield cli.action(
  //   'Cancelling test run',
  //   api.updateTestRun(heroku, testRun.id, { status: 'cancelled' })
  // )
}

module.exports = {
  topic: 'ci',
  command: 'debug',
  needsApp: true,
  needsAuth: true,
  description: 'opens an interactive test debugging session with the contents of the current directory',
  help: ``,
  flags: [
    {
      name: 'no-setup',
      hasValue: false,
      description: 'start test dyno without running test-setup'

    }
  ],
  run: cli.command(co.wrap(run))
}
