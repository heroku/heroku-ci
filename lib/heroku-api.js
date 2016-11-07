const KOLKRABBI = 'https://kolkrabbi.herokuapp.com'
const CI_ACCEPT_HEADER = 'application/vnd.heroku+json; version=3.ci'

function* pipelineCoupling (client, app) {
  return client.get(`/apps/${app}/pipeline-couplings`)
}

function* pipelineRepository (client, pipelineID) {
  return client.request({
    host: KOLKRABBI,
    path: `/pipelines/${pipelineID}/repository`,
    headers: {
      Authorization: `Bearer ${client.options.token}`
    }
  })
}

function* testRun (client, pipelineID, number) {
  return client.request({
    path: `/pipelines/${pipelineID}/test-runs/${number}`,
    headers: {
      Authorization: `Bearer ${client.options.token}`,
      Accept: CI_ACCEPT_HEADER
    }
  })
}

module.exports = {
  pipelineCoupling,
  pipelineRepository,
  testRun
}
