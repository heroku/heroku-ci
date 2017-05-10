/* eslint-env mocha */

const nock = require('nock')
const expect = require('chai').expect
const cli = require('heroku-cli-util')
const cmd = require('../../../commands/ci/config-set')
const Factory = require('../../lib/factory')

describe('heroku ci:config:set', function () {
  let key, value

  beforeEach(function () {
    cli.mockConsole()
    key = 'FOO'
    value = 'bar'
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

    it('sets new config', function* () {
      const api = nock('https://api.heroku.com')
        .get(`/apps/${app}/pipeline-couplings`)
        .reply(200, coupling)
        .patch(`/pipelines/${coupling.pipeline.id}/stage/test/config-vars`)
        .reply(200, { [key]: value })

      yield cmd.run({ app, args: [ `${key}=${value}` ], flags: {} })

      expect(cli.stdout).to.include(key)
      expect(cli.stdout).to.include(value)

      api.done()
    })
  })

  context('when given a pipeline', function () {
    let pipeline

    beforeEach(function () {
      pipeline = Factory.pipeline
    })

    it('sets new config', function* () {
      const api = nock('https://api.heroku.com')
        .get(`/pipelines/${pipeline.id}`)
        .reply(200, pipeline)
        .patch(`/pipelines/${pipeline.id}/stage/test/config-vars`)
        .reply(200, { [key]: value })

      yield cmd.run({ args: [ `${key}=${value}` ], flags: { pipeline: pipeline.id } })

      expect(cli.stdout).to.include(key)
      expect(cli.stdout).to.include(value)

      api.done()
    })
  })
})
