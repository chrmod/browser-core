#!/bin/bash

clear

echo "Opening firefox"

open -a Firefox --args  -chrome chrome://cliqz/content/tests/scripts/run.html -p dev --no-remote
