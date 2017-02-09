const fs = require('fs')
const cli = require('heroku-cli-util')
const co = require('co')
const BB = require('bluebird')
const writeFile = BB.promisify(fs.writeFile)
const unlinkFile = BB.promisify(fs.unlink)

function* run (context, heroku) {
  const appJSONPath = `${process.cwd()}/app.json`
  const appCiJSONPath = `${process.cwd()}/app-ci.json`

  let appJSON, appCiJSON

  try {
    appJSON = require(appJSONPath)
  } catch (e) {
    appJSON = {}
  }

  try {
    appCiJSON = require(appCiJSONPath)
  } catch (e) {
    throw new Error(`Couldn't load app-ci.json. This command must be run from a directory containing an app-ci.json file`)
  }

  if (appJSON.environments == null) {
    appJSON.environments = {}
  }

  appJSON.environments.test = appCiJSON

  yield cli.action(
    'Writing app.json file',
    writeFile(appJSONPath, `${JSON.stringify(appJSON, null, '  ')}\n`)
  )

  yield cli.action(
    'Deleting app-ci.json file',
    unlinkFile(appCiJSONPath)
  )

  cli.log('Migration successful. Please check the contents of your app.json before committing to your repo')
}

module.exports = {
  topic: 'ci',
  command: 'migrate-manifest',
  needsApp: false,
  needsAuth: false,
  description: 'app-ci.json is deprecated. Run this command to migrate to app.json with an environments key.',
  help: `Example:

$ heroku ci:migrate-manifest
Writing app.json file... done
Deleting app-ci.json file... done
Migration successful. Please check the contents of your app.json before committing to your repo`,
  run: cli.command(co.wrap(run))
}
