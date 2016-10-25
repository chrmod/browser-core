#!/bin/env groovy

@NonCPS def entries(m) {m.collect {k, v -> [k, v]}}

props = entries([
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

node('ubuntu && docker && !gpu') {
  stage('checkout') {
    checkout scm
  }

  def helpers = load 'build-helpers.groovy'
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
    archive 'Dockerfile.firefox'
    archive 'run_tests.sh'
  }

}

stage('tests') {
  // Define version of firefox we want to test
  // Full list here: https://ftp.mozilla.org/pub/firefox/releases/
  def firefoxVersions = entries([
    '38.0.6': 'https://ftp.mozilla.org/pub/firefox/releases/38.0.6/linux-x86_64/en-US/firefox-38.0.6.tar.bz2',
    '43.0.4': 'https://ftp.mozilla.org/pub/firefox/releases/43.0.4/linux-x86_64/en-US/firefox-43.0.4.tar.bz2',
    '44.0.2': 'https://ftp.mozilla.org/pub/firefox/releases/44.0.2/linux-x86_64/en-US/firefox-44.0.2.tar.bz2',
    '47.0.1': 'https://ftp.mozilla.org/pub/firefox/releases/47.0.1/linux-x86_64/en-US/firefox-47.0.1.tar.bz2',
    '49.0.2': 'http://archive.mozilla.org/pub/firefox/tinderbox-builds/mozilla-release-linux64-add-on-devel/1474711644/firefox-49.0.2.en-US.linux-x86_64-add-on-devel.tar.bz2'
  ])

  // The extension will be tested on each specified firefox version in parallel
  def stepsForParallel = [:]
  for (int i = 0; i < firefoxVersions.size(); i++) {
    def entry = firefoxVersions.get(i)
    def version = entry[0]
    def url = entry[1]
    stepsForParallel[version] = {
      build(
        job: 'nav-ext-browser-matrix-v2',
        parameters: [
          string(name: 'FIREFOX_VERSION', value: version),
          string(name: 'FIREFOX_URL', value: url),
          string(name: 'TRIGGERING_BUILD_NUMBER', value: env.BUILD_NUMBER),
          string(name: 'TRIGGERING_JOB_NAME', value: env.JOB_NAME),
        ]
      )
    }
  }

  // Run tests in parallel
  parallel stepsForParallel
}
