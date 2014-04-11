https://github.com/mozilla/mozdownload - download FF releases and branches


mozdownload -l de -d /opt/browsers/downloads -a firefox -p linux64 -t release -v 28.0


mozmill --binary=/Applications/Firefox.app --test=tests/test_cliqz_suggestions.js --addon=cliqz\@cliqz.com/ --list