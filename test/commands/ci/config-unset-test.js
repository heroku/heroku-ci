/* eslint-env mocha */

const nock = require('nock')
const cli = require('heroku-cli-util')
const cmd = require('../../../commands/ci/config-unset')
const Factory = require('../../lib/factory')

describe('heroku ci:config:unset', function () {
  let key

  beforeEach(function () {
    cli.mockConsole()
    key = 'FOO'
  })

  context('when given an application', function () {
    let app, coupling

    beforeEach(function () {
      app = '123-app'

      coupling = {
        pipeline: {
          id: '123-abc',
          name: 'test-pipeline'
        }
      }
    })

    it('unsets config', function* () {
      const api = nock('https://api.heroku.com')
        .get(`/apps/${app}/pipeline-couplings`)
        .reply(200, coupling)
        .patch(`/pipelines/${coupling.pipeline.id}/stage/test/config-vars`)
        .reply(200, { [key]: null })

      yield cmd.run({ app, args: [ key ], flags: {} })

      api.done()
    })
  })

  context('when given a pipeline', function () {
    let pipeline

    beforeEach(function () {
      pipeline = Factory.pipeline
    })

    it('unsets config', function* () {
      const api = nock('https://api.heroku.com')
        .get(`/pipelines/${pipeline.id}`)
        .reply(200, pipeline)
        .patch(`/pipelines/${pipeline.id}/stage/test/config-vars`)
        .reply(200, { [key]: null })

      yield cmd.run({ args: [ key ], flags: { pipeline: pipeline.id } })
      api.done()
    })
  })
})
