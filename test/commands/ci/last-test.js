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
      let num = 1234
      let api = nock('https://api.heroku.com')
        .get(`/apps/${app}/pipeline-couplings`)
        .reply(200, coupling)
        .get(`/pipelines/${coupling.pipeline.id}/test-runs`)
        .reply(200, [{number: num}])

      return cmd.run({ app }).then(() => {
        expect(cli.stdout).to.contain(`=== Test run #${num} setup`)
        api.done()
      })
    })
  })

  /*
  describe('when pipeline does not have anuy runs', function () {
    it('reports that there are no runs', function () {
      let api = nock('https://api.heroku.com')
        .get(`/apps/${app}/pipeline-couplings`)
        .reply(200, coupling)
        .get(`/pipelines/${coupling.pipeline.id}/test-runs`)
        .reply(200, null)

      return cmd.run({ app }).then(() => {
        expect(cli.stderr).to.contain('No Heroku CI runs found')
        api.done()
      })
    })
  })
  */
})
