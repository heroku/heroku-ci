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

function * readCommit (commit) {
  const branch = yield getBranch('HEAD')
  const ref = yield getRef(commit)
  const message = yield getCommitMessageTitleLine(ref)

  return Promise.resolve({
    branch: branch,
    ref: ref,
    message: message
  })
}

module.exports = {
  getRef,
  getBranch,
  getCommitMessageTitleLine,
  createArchive,
  readCommit
}
