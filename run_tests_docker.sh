#! /bin/sh

FIREFOX_VERSION=$1
if [ -z $FIREFOX_VERSION ] ; then
    echo "Please specify firefox version: $0 <VERSION>"
else
    # Make sure extension has been built
    if [ ! -d "build/cliqz@cliqz.com/" ]; then
        echo "Building extension for testing"
        ./fern.js build
        if [ $? -ne 0 ] ; then
            echo "Failed to build extension, exiting"
            exit 1
        fi
    fi

    # Package extension
    echo "Package extension"
    rm -vi cliqz@cliqz.com.xpi
    cd build/ && fab package && mv latest.xpi ../cliqz@cliqz.com.xpi && cd ..

    # Make sure autoconfig is there
    if [ ! -d "firefox-autoconfigs" ]; then
        echo "cloning firefox-autoconfigs"
        git clone git@github.com:remi-cliqz/firefox-autoconfigs.git
    fi

    # Build docker
    echo "Building docker for firefox ${FIREFOX_VERSION}"
    DOCKER_BUILD_DIR="docker_build"
    rm -fr ${DOCKER_BUILD_DIR}
    mkdir ${DOCKER_BUILD_DIR}
    cp Dockerfile.firefox ${DOCKER_BUILD_DIR}
    cd ${DOCKER_BUILD_DIR}
    docker build  --build-arg UID=`id -u` --build-arg VERSION=$FIREFOX_VERSION --build-arg GID=`id -g` -f Dockerfile.firefox -t docker-firefox-extension-tests-${FIREFOX_VERSION} .
    cd ..
    rm -fr ${DOCKER_BUILD_DIR}

    # Run docker
    echo "Running tests, you can connect using a vnc client to 'localhost:15900 with password vnc'"
    DOCKER_RUN="docker run  -iP -p 15900:5900 -u 1000:1000 -v `pwd`:/workspace/ -w /workspace -e FIREFOX_DEBUG --entrypoint ./run_tests.sh docker-firefox-extension-tests-${FIREFOX_VERSION}"

    if type xtightvncviewer >/dev/null 2>&1 ; then
        ${DOCKER_RUN} &
        sleep 5
        echo vnc | xtightvncviewer -autopass localhost::15900
    else
        ${DOCKER_RUN}
    fi
fi
