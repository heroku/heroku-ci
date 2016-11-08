/* eslint-env mocha */

const nock = require('nock')
const expect = require('chai').expect
const cli = require('heroku-cli-util')
const cmd = require('../../../commands/ci/last')

describe('heroku ci:last', function () {
  let app, coupling, pipelineRepository, testRun

  beforeEach(function () {
    cli.mockConsole()
    app = '123-app'

    coupling = {
      pipeline: {
        id: '123-abc',
        name: 'test-pipeline'
      }
    }

    runs = [{
      number: 251
    }]
  })

  it('displays pipeline and repo info', function () {
    const api = nock('https://api.heroku.com')
      .get(`/apps/${app}/pipeline-couplings`)
      .reply(200, coupling)
      .get(`/pipelines/${coupling.pipeline.id}/test-runs`)
      .reply(200, runs)

    return cmd.run({ app }).then(() => {
      expect(cli.stdout).to.contain(`=== Test run #${runs[0].number} setup`)
      api.done()
    })
  })
})
