'use strict'
const api = require('./heroku-api')
const got = require('got')
const spawn = require('child_process').spawn
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const tmp = Promise.promisifyAll(require('temp').track())

function * getRef (branch) {
  let refName = branch || 'HEAD'
  const gitBranch = spawn('git', ['rev-parse', '--abbrev-ref', refName])

  return new Promise((resolve, reject) => {
    gitBranch.on('error', reject)
    gitBranch.stdout.on('data', (data) => resolve(data.toString().trim()))
  })
}

function * getBranch () {
  const gitBranch = spawn('git', ['symbolic-ref', '--short', 'HEAD'])

  return new Promise((resolve, reject) => {
    gitBranch.on('error', reject)
    gitBranch.stdout.on('data', (data) => resolve(data.toString().trim()))
  })
}

function * getCommitMessageTitleLine (ref) {
  const refArg = ref || ''
  const gitBranch = spawn('git', ['log', refArg, '-1', '--pretty=format:%s'])

  return new Promise((resolve, reject) => {
    gitBranch.on('error', reject)
    gitBranch.stdout.on('data', (data) => resolve(data.toString().trim()))
  })
}

function * createArchive (ref) {
  const tar = spawn('git', ['archive', '--format', 'tar.gz', ref])
  const file = yield tmp.openAsync({ suffix: '.tgz' })
  const write = tar.stdout.pipe(fs.createWriteStream(file.path))

  return new Promise((resolve, reject) => {
    write.on('close', () => resolve(file.path))
    write.on('error', reject)
  })
}

function * createSource (heroku, appIdentifier) {
  return yield heroku.post(`/sources`)
}

function * uploadArchive (url, filePath) {
  const request = got.stream.put(url, {
    headers: {
      'content-length': (yield fs.statAsync(filePath)).size
    }
  })

  fs.createReadStream(filePath).pipe(request)

  return new Promise((resolve, reject) => {
    request.on('error', reject)
    request.on('response', resolve)
  })
}

function * uploadArchiveAndCreateRun (context, heroku) {
  const branch = context.args.branch || (yield getBranch())
  const ref = yield getRef(branch)
  const commitMessage = yield getCommitMessageTitleLine(branch)
  const coupling = yield api.pipelineCoupling(heroku, context.app)
  const pipeline = coupling.pipeline.id
  const filePath = yield createArchive(ref)
  const source = yield createSource(heroku, context.app)

  yield uploadArchive(source.source_blob.put_url, filePath)

  return yield api.createTestRun(heroku, {
    commit_branch: branch,
    commit_message: commitMessage,
    commit_sha: ref,
    pipeline: pipeline,
    source_blob_url: source.source_blob.get_url
  })
}

module.exports = {
  uploadArchiveAndCreateRun
}
