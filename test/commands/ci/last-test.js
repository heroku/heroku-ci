/* eslint-env mocha */

const nock = require('nock')
const expect = require('chai').expect
const cli = require('heroku-cli-util')
const cmd = require('../../../commands/ci/last')

describe('heroku ci:last', function () {
  let app, coupling, run

  beforeEach(function () {
    cli.mockConsole()
    app = '123-app'

    coupling = {
      pipeline: {
        id: '123-abc'
      }
    }
  })

  describe('when pipeline has runs', function () {
    it('displays the results of the latest run', function () {
      run = [{ number: 251 }]
      let api = nock('https://api.heroku.com')
        .get(`/apps/${app}/pipeline-couplings`)
        .reply(200, coupling)
        .get(`/pipelines/${coupling.pipeline.id}/test-runs`)
        .reply(200, run)

      return cmd.run({ app }).then(() => {
        expect(cli.stdout).to.contain(`=== Test run #${run[0].number} setup`)
        api.done()
      })
    })
  })

  describe('when pipeline does not have anuy runs', function () {
    it.skip('reports that there are no runs', function () {
      run = undefined
      let api = nock('https://api.heroku.com')
        .get(`/apps/${app}/pipeline-couplings`)
        .reply(200, coupling)
        .get(`/pipelines/${coupling.pipeline.id}/test-runs`)
        .reply(200, run)

      return cmd.run({ app }).then(() => {
        expect(cli.stderr).to.contain('No Heroku CI runs found')
        api.done()
      })
    })
  })
})
