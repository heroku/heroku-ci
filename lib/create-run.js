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

function * getBranch (symbolicRef) {
  return runGit('symbolic-ref', '--short', symbolicRef)
}

function * getCommitMessageTitleLine (ref) {
  return runGit('log', ref || '', '-1', '--pretty=format:%s')
}

function * createArchive (ref) {
  const tar = spawn('git', ['archive', '--format', 'tar.gz', ref])
  const file = yield tmp.openAsync({ suffix: '.tar.gz' })
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

function * prepareSource(ref, context, heroku) {
  const filePath = yield createArchive(ref)
  const source = yield createSource(heroku, context.app)
  const upload = yield uploadArchive(source.source_blob.put_url, filePath)
  return Promise.resolve(source)
}

function * readCommit(commit) {
  const branch = yield getBranch('HEAD')
  const ref = yield getRef(commit)
  const message = yield getCommitMessageTitleLine(ref)

  return Promise.resolve({
    branch: branch,
    ref: ref,
    message: message
  })
}

function * uploadArchiveAndCreateRun (pipeline, context, heroku) {
  const commit = yield readCommit('HEAD')
  const source = yield prepareSource(commit.ref, context, heroku)

  return yield api.createTestRun(heroku, {
    commit_branch: commit.branch,
    commit_message: commit.message,
    commit_sha: commit.ref,
    pipeline: pipeline.id,
    source_blob_url: source.source_blob.get_url
  })
}

module.exports = {
  uploadArchiveAndCreateRun
}
