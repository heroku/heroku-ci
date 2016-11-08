'use strict'
const api = require('./heroku-api')
const got = require('got')
const spawn = require('child_process').spawn
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const tmp = Promise.promisifyAll(require('temp').track())

function runGit () {
  const git = spawn('git', Array.from(arguments))

  return new Promise((resolve, reject) => {
    git.on('error', reject)
    git.stdout.on('data', (data) => resolve(data.toString().trim()))
  })
}

function * getRef (branch) {
  return runGit('rev-parse', '--abbrev-ref', branch || 'HEAD')
}

function * getBranch () {
  return runGit('symbolic-ref', '--short', 'HEAD')
}

function * getCommitMessageTitleLine (ref) {
  return runGit('log', ref || '', '-1', '--pretty=format:%s')
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
  const commitMessage = yield getCommitMessageTitleLine(ref)
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
