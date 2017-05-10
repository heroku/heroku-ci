/* eslint-env mocha */

const nock = require('nock')
const expect = require('chai').expect
const cli = require('heroku-cli-util')
const cmd = require('../../../commands/ci/config-index')
const Factory = require('../../lib/factory')

describe('heroku ci:config', function () {
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

    it('displays config', function* () {
      const api = nock('https://api.heroku.com')
        .get(`/apps/${app}/pipeline-couplings`)
        .reply(200, coupling)
        .get(`/pipelines/${coupling.pipeline.id}/stage/test/config-vars`)
        .reply(200, { [key]: value })

      yield cmd.run({ app, flags: {} })

      expect(cli.stdout).to.include(`${key}: ${value}`)
      api.done()
    })

    it('displays config formatted for shell', function* () {
      const api = nock('https://api.heroku.com')
        .get(`/apps/${app}/pipeline-couplings`)
        .reply(200, coupling)
        .get(`/pipelines/${coupling.pipeline.id}/stage/test/config-vars`)
        .reply(200, { [key]: value })

      yield cmd.run({ app, flags: { shell: true } })

      expect(cli.stdout).to.include(`${key}=${value}`)
      api.done()
    })

    it('displays config formatted as JSON', function* () {
      const api = nock('https://api.heroku.com')
        .get(`/apps/${app}/pipeline-couplings`)
        .reply(200, coupling)
        .get(`/pipelines/${coupling.pipeline.id}/stage/test/config-vars`)
        .reply(200, { [key]: value })

      yield cmd.run({ app, flags: { json: true } })

      expect(cli.stdout).to.include('{\n  "FOO": "bar"\n}')
      api.done()
    })
  })

  context('when given a pipeline', function () {
    let pipeline

    beforeEach(function () {
      pipeline = Factory.pipeline
    })

    it('displays config', function* () {
      const api = nock('https://api.heroku.com')
        .get(`/pipelines/${pipeline.id}`)
        .reply(200, pipeline)
        .get(`/pipelines/${pipeline.id}/stage/test/config-vars`)
        .reply(200, { [key]: value })

      yield cmd.run({ flags: { pipeline: pipeline.id } })

      expect(cli.stdout).to.include(`${key}: ${value}`)
      api.done()
    })

    it('displays config formatted for shell', function* () {
      const api = nock('https://api.heroku.com')
        .get(`/pipelines/${pipeline.id}`)
        .reply(200, pipeline)
        .get(`/pipelines/${pipeline.id}/stage/test/config-vars`)
        .reply(200, { [key]: value })

      yield cmd.run({ flags: { shell: true, pipeline: pipeline.id } })

      expect(cli.stdout).to.include(`${key}=${value}`)
      api.done()
    })

    it('displays config formatted as JSON', function* () {
      const api = nock('https://api.heroku.com')
        .get(`/pipelines/${pipeline.id}`)
        .reply(200, pipeline)
        .get(`/pipelines/${pipeline.id}/stage/test/config-vars`)
        .reply(200, { [key]: value })

      yield cmd.run({ flags: { json: true, pipeline: pipeline.id } })

      expect(cli.stdout).to.include('{\n  "FOO": "bar"\n}')
      api.done()
    })
  })
})
