#!/bin/env groovy

node('ubuntu && docker && !gpu') {
  stage('checkout') {
    checkout scm
  }

  def helpers = load 'build-helpers.groovy'
  def gitCommit = helpers.getGitCommit()
  def imgName = "cliqz/navigation-extension:${env.BUILD_TAG}"

  stage('docker build') {
    sh "docker build -t ${imgName} --build-arg UID=`id -u` --build-arg GID=`id -g` ."
    dockerFingerprintFrom dockerfile: './Dockerfile', image: imgName, toolName: env.DOCKER_TOOL_NAME
  }

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

  stage('publish artifacts') {
    archive "build/Cliqz.${gitCommit}.xpi"
    archive 'Dockerfile.firefox'
    archive 'run_tests.sh'
  }

}

stage('tests') {
  // Define version of firefox we want to test
  // Full list here: https://ftp.mozilla.org/pub/firefox/releases/
  def firefoxVersions = [
    '38.0.6',
    '43.0.4',
    '44.0.2',
    '47.0.1',
  ]

  // The extension will be tested on each specified firefox version in parallel
  def stepsForParallel = [:]
  for (int i = 0; i < firefoxVersions.size(); i++) {
    def version = firefoxVersions.get(i)
    stepsForParallel[version] = {
      build(
        job: 'nav-ext-browser-matrix',
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
