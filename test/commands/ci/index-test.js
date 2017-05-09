/* eslint-env mocha */

const nock = require('nock')
const expect = require('chai').expect
const cli = require('heroku-cli-util')
const cmd = require('../../../commands/ci')[0]
const stdMocks = require('std-mocks')

describe('heroku ci', function () {
  let runs

  beforeEach(function () {
    cli.mockConsole()

    runs = [{
      number: 123,
      commit_branch: 'foo',
      commit_sha: '1234567',
      status: 'running'
    }]
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

    it('displays recent runs', function* () {
      const api = nock('https://api.heroku.com')
        .get(`/apps/${app}/pipeline-couplings`)
        .reply(200, coupling)
        .get(`/pipelines/${coupling.pipeline.id}/test-runs`)
        .reply(200, runs)

      stdMocks.use()

      yield cmd.run({ app, flags: {} })

      stdMocks.restore()
      const { stdout } = stdMocks.flush()

      expect(stdout[0]).to.contain(runs[0].number)
      expect(stdout[0]).to.contain(runs[0].commit_branch)
      expect(stdout[0]).to.contain(runs[0].commit_sha)
      expect(stdout[0]).to.contain(runs[0].status)

      api.done()
    })
  })

  context('when given a pipeline', function () {
    let pipeline

    beforeEach(function () {
      pipeline = {
        id: '123-abc',
        name: 'test-pipeline'
      }
    })

    it('displays recent runs', function* () {
      const api = nock('https://api.heroku.com')
        .get(`/pipelines/${pipeline.name}`)
        .reply(200, pipeline)
        .get(`/pipelines/${pipeline.id}/test-runs`)
        .reply(200, runs)

      stdMocks.use()

      yield cmd.run({ flags: { pipeline: pipeline.name } })

      stdMocks.restore()
      const { stdout } = stdMocks.flush()

      expect(stdout[0]).to.contain(runs[0].number)
      expect(stdout[0]).to.contain(runs[0].commit_branch)
      expect(stdout[0]).to.contain(runs[0].commit_sha)
      expect(stdout[0]).to.contain(runs[0].status)

      api.done()
    })
  })
})
