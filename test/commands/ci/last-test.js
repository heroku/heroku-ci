/* eslint-env mocha */

const nock = require('nock')
const expect = require('chai').expect
const cli = require('heroku-cli-util')
const sinon = require('sinon')
const cmd = require('../../../commands/ci/last')

describe('heroku ci:last', function () {
  let testRun, testNode, setupOutput, testOutput

  function setup (pipeline) {
    testRun = {
      id: '123-abc',
      number: 123,
      pipeline: pipeline,
      status: 'succeeded',
      commit_sha: '123abc456def',
      commit_branch: 'master'
    }

    testNode = {
      output_stream_url: 'https://output.com/tests',
      setup_stream_url: 'https://output.com/setup',
      test_run: { id: testRun.id },
      exit_code: 1
    }
  }

  beforeEach(function () {
    cli.mockConsole()
    sinon.stub(process, 'exit')

    setupOutput = ''
    testOutput = ''
  })

  afterEach(function () {
    process.exit.restore()
  })

  context('when given an application', function () {
    let app, coupling

    beforeEach(function () {
      app = '123-app'

      coupling = {
        pipeline: {
          id: '123-abc',
          name: '123-abc'
        }
      }

      setup(coupling.pipeline)
    })

    it('and its pipeline has runs, displays the results of the latest run', function* () {
      const api = nock('https://api.heroku.com')
        .get(`/apps/${app}/pipeline-couplings`)
        .reply(200, coupling)
        .get(`/pipelines/${coupling.pipeline.id}/test-runs`)
        .reply(200, [testRun])
        .get(`/pipelines/${coupling.pipeline.id}/test-runs/${testRun.number}`)
        .reply(200, testRun)
        .get(`/test-runs/${testRun.id}/test-nodes`)
        .reply(200, [testNode])
        .get(`/test-runs/${testRun.id}/test-nodes`)
        .reply(200, [testNode])

      const streamAPI = nock('https://output.com')
        .get('/setup')
        .reply(200, setupOutput)
        .get('/tests')
        .reply(200, testOutput)

      yield cmd.run({ app, flags: {} })
      expect(cli.stdout).to.contain(`✓ #${testRun.number}`)

      api.done()
      streamAPI.done()
    })

    it('and its pipeline does not have any runs, reports that there are no runs', function* () {
      let api = nock('https://api.heroku.com')
        .get(`/apps/${app}/pipeline-couplings`)
        .reply(200, coupling)
        .get(`/pipelines/${coupling.pipeline.id}/test-runs`)
        .reply(200, [])

      yield cmd.run({ app, flags: {} })
      expect(cli.stderr).to.contain('No Heroku CI runs found')
      api.done()
    })
  })

  context('when given a pipeline', function () {
    let pipeline

    beforeEach(function () {
      pipeline = {
        id: '123-abc',
        name: '123-abc'
      }

      setup(pipeline)
    })

    it('with runs, displays the results of the latest run', function* () {
      const api = nock('https://api.heroku.com')
        .get(`/pipelines/${pipeline.name}`)
        .reply(200, pipeline)
        .get(`/pipelines/${pipeline.id}/test-runs`)
        .reply(200, [testRun])
        .get(`/pipelines/${pipeline.id}/test-runs/${testRun.number}`)
        .reply(200, testRun)
        .get(`/test-runs/${testRun.id}/test-nodes`)
        .reply(200, [testNode])
        .get(`/test-runs/${testRun.id}/test-nodes`)
        .reply(200, [testNode])

      const streamAPI = nock('https://output.com')
        .get('/setup')
        .reply(200, setupOutput)
        .get('/tests')
        .reply(200, testOutput)

      yield cmd.run({ flags: { pipeline: pipeline.name } })
      expect(cli.stdout).to.contain(`✓ #${testRun.number}`)

      api.done()
      streamAPI.done()
    })

    it('without any runs, reports that there are no runs', function* () {
      let api = nock('https://api.heroku.com')
        .get(`/pipelines/${pipeline.name}`)
        .reply(200, pipeline)
        .get(`/pipelines/${pipeline.id}/test-runs`)
        .reply(200, [])

      yield cmd.run({ flags: { pipeline: pipeline.name } })
      expect(cli.stderr).to.contain('No Heroku CI runs found')
      api.done()
    })
  })
})
