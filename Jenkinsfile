NODE_LABELS_DEFAULT = 'docker'
properties([
  [
    $class: 'ParametersDefinitionProperty',
    parameterDefinitions: [
      [
        $class: 'StringParameterDefinition',
        defaultValue: NODE_LABELS_DEFAULT,
        description: '',
        name: 'NODE_LABELS'
      ]
    ]
  ]
])

try {
  NODE_LABELS
} catch(all) {
  NODE_LABELS = NODE_LABELS_DEFAULT
}

try {
  CLIQZ_PRE_RELEASE
} catch (all) {
  CLIQZ_PRE_RELEASE = "False"
}

try {
  CLIQZ_BETA
} catch (all) {
  CLIQZ_BETA = "True"
}

try {
  TEST_ONLY
} catch (all) {
  TEST_ONLY = true
}

try {
  CLIQZ_CHANNEL
} catch(all) {
  CLIQZ_CHANNEL = 'browser'
}

node(NODE_LABELS) {
  stage 'checkout'
  checkout scm

  def imgName = "cliqz/navigation-extension:${env.BUILD_TAG}"

  stage 'docker build'
  sh "docker build -t ${imgName} --build-arg UID=`id -u` --build-arg GID=`id -g` ."
  dockerFingerprintFrom dockerfile: "./Dockerfile", image: imgName, toolName: env.DOCKER_TOOL_NAME

  docker.image(imgName).inside() {
    withEnv(["CLIQZ_CONFIG_PATH=./configs/${CLIQZ_CHANNEL}.json"]) {
      stage 'fern install'
      sh './fern.js install'

      if ( !TEST_ONLY ) {
        stage 'checkout xpi-sign'
        checkout([
          $class: 'GitSCM',
          branches: [[name: '*/cliqz-ci']],
          doGenerateSubmoduleConfigurations: false,
          extensions: [[
            $class: 'RelativeTargetDirectory',
            relativeTargetDir: '../workspace@script/xpi-sign'
          ]],
          submoduleCfg: [],
          userRemoteConfigs: [[
            credentialsId: XPI_SIGN_CREDENTIALS,
            url: XPI_SIGN_REPO_URL
          ]]
        ])

        stage 'fern build'
        sh './fern.js build'

        stage 'fab publish'
        try {
          sh '''#!/bin/bash +x
            rm -fr certs
            cp -R /cliqz certs
          '''

          sh """#!/bin/bash -l
            cd build/
            set +x
            source ../certs/beta-upload-creds.sh
            set -x
            fab publish:beta=${CLIQZ_BETA},channel=${CLIQZ_CHANNEL},pre=${CLIQZ_PRE_RELEASE}
          """

        } finally {
          sh 'rm -rf certs'
        }
      } else {
        stage 'fern test'
        sh 'rm -rf tests.xml'
        sh './fern.js test --ci tests.xml'
        step([$class: 'JUnitResultArchiver', allowEmptyResults: false, testResults: 'tests.xml'])
      }
    }
  }
}
