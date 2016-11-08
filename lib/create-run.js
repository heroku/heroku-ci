'use strict'
const got = require('got')
const api = require('./heroku-api')
const git = require('./git')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))

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

function * prepareSource (ref, context, heroku) {
  const [filePath, source] = yield [
    git.createArchive(ref),
    api.createSource(heroku)
  ]
  yield uploadArchive(source.source_blob.put_url, filePath)
  return Promise.resolve(source)
}

module.exports = {
  prepareSource
}
