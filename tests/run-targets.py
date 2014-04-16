#!/usr/bin/env python
import paramiko
import yaml
import select
import os.path


def _get_ssh_pk(private_key_path):
    private_key_path = os.path.expanduser(private_key_path)
    key = paramiko.RSAKey.from_private_key(open(private_key_path))
    return key


def ssh(ip, port, user, key):
    def exec_ssh_command(cmd):
        ssh = paramiko.SSHClient()
        try:
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh.connect(ip, port=port, username=user, pkey=key)

            stdin, stdout, stderr = ssh.exec_command(cmd)
            output = ''.join(stdout.readlines())
            errput = ''.join(stderr.readlines())

            return output, errput
        finally:
            ssh.close()

    return exec_ssh_command


def run_linux(ip, manifests=[], port=22,
    user='vagrant', private_key_path='~/.vagrant.d/insecure_private_key',
    platform='', verbose=False):

    # shell fonts
    # http://unix.stackexchange.com/questions/37260/change-font-in-echo-command

    pk = _get_ssh_pk(private_key_path)
    exec_ssh_command = ssh(ip, port, user, pk)

    versions, _ = exec_ssh_command('ls -1 /opt/browsers/firefox')
    versions = versions.strip().split('\n')
    print('\n\033[1m{platform} available versions\033[00m: {versions}'.format(
        versions=', '.join(versions), platform=platform))

    # cmd = ' '.join([
    #     'DISPLAY=:0',
    #     'mozmill',
    #     '--binary=/opt/browsers/firefox/{version}/firefox',
    #     '--manifest=/vagrant/tests/mozmill/{manifest}',
    #     '--addon=/vagrant/cliqz\\@cliqz.com',
    #     '--screenshots-path=/tmp',
    #     # '--format=json'
    # ])

    cmd = ' '.join([
        '/usr/local/bin/mozmill',
        '-b "/opt/browsers/firefox/{version}"',
        '-m "/Volumes/VMware Shared Folders/navigation-extension/tests/mozmill/all-tests.ini"'
    ])

    for (manifest, version) in ((m, v) for m in manifests for v in versions):
        print('\n\033[4mRunning tests {manifest} with Firefox {version}\033[00m\n'.format(**locals()))
        out, err = exec_ssh_command(cmd.format(**locals()))
        if out: print(out)
        if err: print(err)


def run_mac(): pass
def run_win(): pass

if __name__ == '__main__':
    ip = '192.168.33.22'
    ip = '192.168.61.134'
    run_linux(ip=ip, manifests=['all-tests.ini'],
        platform='Ubuntu 12.04')