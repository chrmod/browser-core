#!/usr/bin/env python
import paramiko
import yaml
import select
import requests
import os.path
import json
import re
import ConfigParser
from commandr import command, Run
from functools import partial
from itertools import chain
from operator import attrgetter


def get_ssh_pk(private_key_path):
    private_key_path = os.path.expanduser(private_key_path)
    key = paramiko.RSAKey.from_private_key(open(private_key_path))
    return key


def ssh(ip, port=22, user='vagrant',
    key_path='~/.vagrant.d/insecure_private_key'):

    key = get_ssh_pk(key_path)
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


class ssh_api(object):

    def __init__(self, ip):
        self.ip = ip
        self.ssh = ssh(ip)


class linux_api(ssh_api):

    @property
    def versions(self):
        if not hasattr(self, '_versions'):
            out, _ = self.ssh('ls -1 /opt/browsers/firefox')
            self._versions = out.strip().split('\n')
        return list(self._versions)

    def exec_test(self, version, manifest):
        cmd = ' '.join([
            'DISPLAY=:0',
            'mozmill',
            '-b /opt/browsers/firefox/{version}/firefox',
            '-m /vagrant/tests/mozmill/{manifest}.ini',
            '-a /vagrant/cliqz\\@cliqz.com',
            # '--screenshots-path=/tmp',
            # '--format=json'
        ])
        return self.ssh(cmd.format(**locals()))

class osx_api(ssh_api):

    @property
    def versions(self):
        if not hasattr(self, '_versions'):
            out, _ = self.ssh('ls -1 /opt/browsers/firefox')
            self._versions = re.findall('Firefox (.*).app', out)
        return list(self._versions)

    def exec_test(self, version, manifest):
        cmd = ' '.join([
            '/usr/local/bin/mozmill',
            '-b "/opt/browsers/firefox/Firefox {version}.app"',
            '-m "/vagrant/tests/mozmill/{manifest}.ini"',
            '-a "/vagrant/cliqz@cliqz.com"'
        ])
        return self.ssh(cmd.format(**locals()))


class win_api(ssh_api):

    @property
    def versions(self):
        if not hasattr(self, '_versions'):
            out, _ = self.ssh('ls -1 /cygdrive/c/browsers/firefox')
            self._versions = out.strip().split('\n')
        return list(self._versions)

    def exec_test(self, version, manifest):
        data = {
            'cmd': [
                'c:\\Python27\\Scripts\\mozmill.exe',
                '-b', 'c:\\browsers\\firefox\\{version}\\firefox.exe'.format(**locals()),
                '-m', 'c:\\vagrant\\tests\\mozmill\\{manifest}.ini'.format(**locals()),
                '-a', 'c:\\vagrant\\cliqz@cliqz.com',
                # '--format=json'
            ]
        }

        headers =  {
            'Content-type': 'application/json',
            'Accept': 'application/json'
        }

        res = requests.get('http://{}/exec'.format(self.ip),
            data=json.dumps(data), headers=headers)

        assert res.ok, 'Check Mozmill HTTP Server running on Win box'
        res = res.json()
        return (res['stdout'], res['stderr'])


def exec_tests(test_nodes, test_ini):
    versions = chain.from_iterable(map(attrgetter('versions'), test_nodes))
    versions = sorted(set(versions))

    print '\nVersions: {}'.format(', '.join(versions))

    for version in versions:
        print '\nTesting version {}'.format(version)
        for node in (n for n in test_nodes if version in n.versions):
            stdout, stderr = node.exec_test(version, test_ini)
            res = 'ERROR' if 'ERROR' in stdout else 'OK'
            print '[{node.ip}] - {res}'.format(node=node, res=res)
            print stdout
            print stderr


@command('all')
def run_all(test_ini='all-tests', os_filter=None):
    inventory_file = os.path.join(
        os.path.dirname(__file__), '..',
        'tests', 'deployment', 'inventory.ini')
    inventory_file = os.path.abspath(inventory_file)

    cfg = ConfigParser.SafeConfigParser(allow_no_value=True)
    cfg.read(inventory_file)
    sections = {'linux', 'osx', 'win'}.intersection(cfg.sections())

    sections = [s for s in sections if os_filter == None or s == os_filter]
    test_nodes = []

    for section in sections:
        items = cfg.items(section)
        items = map(partial(filter, None), items)
        items = map('='.join, items)

        api = globals()['{}_api'.format(section)]
        apis = map(api, items)
        test_nodes.extend(apis)

    exec_tests(test_nodes, test_ini)


if __name__ == '__main__':
    Run()
