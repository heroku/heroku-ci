/* eslint-env mocha */

const nock = require('nock')
const expect = require('chai').expect
const cli = require('heroku-cli-util')
const cmd = require('../../../commands/ci/last')

describe('heroku ci:last', function () {
  let app, coupling

  beforeEach(function () {
    cli.mockConsole()
    app = '123-app'

    coupling = {
      pipeline: {
        id: '123-abc',
        name: '123-abc'
      }
    }
  })

  describe('when pipeline has runs', function () {
    it('displays the results of the latest run', function () {
      let lastRun = {
        app_setup: { id: '4932044c-d469-4ca3-8350-0a23b8af51ea' },
        created_at: '2016-11-08T19:02:15+00:00',
        commit_branch: 'master',
        commit_message: 'Add buildpacks to app.json',
        commit_sha: 'master',
        actor_email: 'foo@heroku.com',
        error_status: 'running',
        exit_code: 1,
        id: '5835ac0f-a082-4e48-85b1-77c77797d03b',
        message: 'Error executing \'test\' script',
        number: 304,
        organization: null,
        status: 'failed',
        updated_at: '2016-11-08T19:02:38+00:00',
        user: { id: 'some-heroku-user-id' }
      }
      let api = nock('https://api.heroku.com')
        .get(`/apps/${app}/pipeline-couplings`)
        .reply(200, coupling)
        .get(`/pipelines/${coupling.pipeline.id}/test-runs`)
        .reply(200, [lastRun])

      return cmd.run({ app }).then(() => {
        expect(cli.stdout).to.contain(`=== Test run #${lastRun.number} setup`)
        api.done()
      })
    })
  })

  describe('when pipeline does not have anuy runs', function () {
    it('reports that there are no runs', function () {
      let api = nock('https://api.heroku.com')
        .get(`/apps/${app}/pipeline-couplings`)
        .reply(200, coupling)
        .get(`/pipelines/${coupling.pipeline.id}/test-runs`)
        .reply(200, undefined)

      return cmd.run({ app }).then(() => {
        expect(cli.stderr).to.contain('No Heroku CI runs found')
        api.done()
      })
    })
  })
})
