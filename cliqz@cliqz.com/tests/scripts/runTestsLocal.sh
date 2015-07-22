#!/bin/bash

clear

echo "Opening firefox"

open -a Firefox --args -chrome chrome://cliqztests/content/scripts/run.html -p dev --no-remote
