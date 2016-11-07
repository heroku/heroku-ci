const SIMI = 'https://simi.heroku.com'
const ioClient = require('socket.io-client')

function connect () {
  return ioClient(SIMI)
}

module.exports = {
  connect
}
