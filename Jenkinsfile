node('ubuntu && docker && gpu') {
  timeout(time: 20, unit: 'MINUTES') {
    stage 'checkout'
    checkout scm
    checkout([
      $class: 'GitSCM',
      branches: [[name: '*/master']],
      doGenerateSubmoduleConfigurations: false,
      extensions: [[
        $class: 'RelativeTargetDirectory',
        relativeTargetDir: 'firefox-autoconfigs'
      ]],
      submoduleCfg: [],
      userRemoteConfigs: [[
        url: "https://github.com/cliqz-oss/firefox-autoconfigs.git"
      ]]
    ])

    stage 'docker build'
    def imgName = "cliqz/navigation-extension:latest"
    sh "docker build -t ${imgName} --build-arg UID=`id -u` --build-arg GID=`id -g` ."
    fingerprintDocker(imgName, "Dockerfile")

    docker.image(imgName).inside() {
      // Unit tests
      withEnv(["CLIQZ_CONFIG_PATH=./configs/browser.json"]) {
        stage 'fern install'
        sh './fern.js install'

        stage 'fern test'
        sh 'rm -rf unittest-report.xml'
        sh './fern.js test --ci unittest-report.xml'
      }

      // Build extension for integration tests
      withEnv(["CLIQZ_CONFIG_PATH=./configs/jenkins.json"]) {
        stage 'fern build'
        sh 'rm -fr build/'
        sh './fern.js build'
      }
    }

    stage 'test firefox'
    // Define version of firefox we want to test
    // Full list here: https://ftp.mozilla.org/pub/firefox/releases/
    def firefoxVersions = [
      "38.0.6",
      "43.0.4",
      "44.0.2",
      "47.0.1"
    ]

    // The extension will be tested on each specified firefox version in parallel
    def stepsForParallel = [:]
    for (int i = 0; i < firefoxVersions.size(); i++) {
      def version = firefoxVersions.get(i)
      stepsForParallel[version] = testInFirefoxVersion(version)
    }
    parallel stepsForParallel

    // Register results
    step([$class: 'JUnitResultArchiver', allowEmptyResults: false, testResults: '*report*.xml'])
  }
}


def testInFirefoxVersion(version) {
  return {
    // Docker build (firefox)
    def firefoxImgName  = "cliqz/firefox-${version}-navigation-extension:latest"
    def dockerfile = "Dockerfile.firefox"

    sh "docker build -t ${firefoxImgName} --build-arg UID=`id -u` --build-arg GID=`id -g` --build-arg VERSION='${version}' -f Dockerfile.firefox ."
    fingerprintDocker(firefoxImgName, dockerfile)
    dockerFingerprintFrom dockerfile: "./Dockerfile.firefox", image: firefoxImgName, toolName: env.DOCKER_TOOL_NAME

    docker.image(firefoxImgName).inside('--device /dev/nvidia0 --device /dev/nvidiactl') {
      // Add testing configuration for firefox
      sh 'cp -v firefox-autoconfigs/autoconfig.js /home/jenkins/firefox/defaults/pref/autoconfig.js'
      sh 'cp -v firefox-autoconfigs/firefox.cfg /home/jenkins/firefox/firefox.cfg'

      // Install extension
      sh 'cp -fr ./build/cliqz@cliqz.com /home/jenkins/firefox/distribution/extensions/'

      // Run tests
      sh 'xvfb-run -e /dev/stdout --auto-servernum /home/jenkins/firefox/firefox -profile /home/jenkins/profile --no-remote -chrome chrome://cliqz/content/firefox-tests/run.html'

      // Move tests report into workspace
      sh 'mv -v /home/jenkins/profile/mocha-report-* ./'
    }
  }
}


def fingerprintDocker(imgName, dockerfile) {
  dockerFingerprintFrom dockerfile: "./" + dockerfile, image: imgName, toolName: env.DOCKER_TOOL_NAME
}
