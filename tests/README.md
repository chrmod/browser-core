https://github.com/mozilla/mozdownload - download FF releases and branches


mozdownload -l de -d /opt/browsers/downloads -a firefox -p linux64 -t release -v 28.0


mozmill --binary=/Applications/Firefox.app --test=tests/test_cliqz_suggestions.js --addon=cliqz\@cliqz.com/ --list


## General FF info

- [Releases](https://ftp.mozilla.org/pub/mozilla.org/firefox/releases/)

## Configuring Ubuntu box

- [Configuring Vagrant Box](https://github.com/fespinoza/checklist_and_guides/wiki/Creating-a-vagrant-base-box-for-ubuntu-12.04-32bit-server)
- [Removing password + Auto Login](http://askubuntu.com/questions/281074/can-i-set-my-user-account-to-have-no-password)

## Configuring Crap OS X box

- sshpass is required to run ansible against OS X [sshpass installation](http://thornelabs.net/2014/02/09/ansible-os-x-mavericks-you-must-install-the-sshpass-program.html)
- vagrant must be in sudoers [without password](http://wiki.summercode.com/sudo_without_a_password_in_mac_os_x)