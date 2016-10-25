#!/bin/env groovy

node('ubuntu && docker && !gpu') {
  stage('checkout') {
    checkout scm
  }

  helpers = load 'build-helpers.groovy'

  props = helpers.entries([
    'DOCKER_REGISTRY_URL': 'https://141047255820.dkr.ecr.us-east-1.amazonaws.com',
    'AWS_REGION': 'us-east-1'
  ])

  params = []

  for (int i = 0; i < props.size(); i++) {
    def prop  = props.get(i)
    def propName = prop[0]
    def propValue = prop[1]
    def binding = getBinding()

    if (!binding.hasVariable(propName)) {
      binding.setVariable(propName, propValue)
    }

    params.push(
      string(defaultValue: propValue, description: '', name: propName)
    )
  }

  properties([
    parameters(params)
  ])

  def gitCommit = helpers.getGitCommit()
  def imgName = "navigation-extension/base:latest"

  sh "`aws ecr get-login --region=$AWS_REGION`"

  docker.withRegistry(DOCKER_REGISTRY_URL) {
    timeout(60) {
      docker.image(imgName).inside() {

        helpers.withCache {
          stage('fern install') {
            sh './fern.js install'
          }

          // Build extension for integration tests
          withEnv(['CLIQZ_CONFIG_PATH=./configs/jenkins.json']) {
            stage('fern build') {
              sh './fern.js build'
            }

            stage('fern test') {
              try {
                sh 'rm -rf unittest-report.xml'
                  sh './fern.js test --ci unittest-report.xml'
              } catch(err) {
                print "TESTS FAILED"
                  currentBuild.result = "FAILURE"
              } finally {
                step([
                    $class: 'JUnitResultArchiver',
                    allowEmptyResults: false,
                    testResults: 'unittest-report.xml',
                ])
              }
            }
          }
        }

        stage('package') {
          sh """
            cd build
            fab package:beta=True,version=${gitCommit}
          """
        }
      }
    }
  }

  stage('publish artifacts') {
    archive "build/Cliqz.${gitCommit}.xpi"
    archive 'run_tests.sh'
  }

}

stage('tests') {
  // Define version of firefox we want to test
  // Full list here: https://ftp.mozilla.org/pub/firefox/releases/

  // The extension will be tested on each specified firefox version in parallel
  def stepsForParallel = [:]
  def firefoxVersions = helpers.firefoxVersions

  for (int i = 0; i < firefoxVersions.size(); i++) {
    def entry = firefoxVersions.get(i)
    def version = entry[0]
    def url = entry[1]
    stepsForParallel[version] = {
      build(
        job: 'nav-ext-browser-matrix-v3',
        parameters: [
          string(name: 'FIREFOX_VERSION', value: version),
          string(name: 'TRIGGERING_BUILD_NUMBER', value: env.BUILD_NUMBER),
          string(name: 'TRIGGERING_JOB_NAME', value: env.JOB_NAME),
        ]
      )
    }
  }

  // Run tests in parallel
  parallel stepsForParallel
}
