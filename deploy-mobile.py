#!/usr/bin/env python

# WARNING: not tested under Windows

import os
import sys
from boto.s3.connection import S3Connection
from fnmatch import fnmatch


conn = S3Connection()
bucket = conn.get_bucket('cdn.cliqz.com')
prefix = 'mobile/extension'

# 5 minutes
cache_control_default = 'max-age=300'
cache_control_exceptions = {
    # 1 year
    'js/*': 'max-age=31536000',
    'skin/*': 'max-age=31536000',
    # 1 day
    'locale/*': 'max-age=86400',
    'static/*': 'max-age=86400',
    # 1 hour
    'templates/*': 'max-age=3600',
}
exclude_files = ['.DS_Store', '*.map']


def upload_dir(dir):
    for root, _, files in os.walk(dir):
        for file in files:
            if any([fnmatch(file, pattern) for pattern in exclude_files]):
                print 'excluding %s' % file
                continue

            relpath = os.path.relpath(root, dir)
            abspath = os.path.abspath(os.path.join(root, file))

            if os.curdir != relpath:
                relpath = os.path.join(relpath, file)
            else:
                relpath = file

            upload_file(abspath, relpath)


def upload_file(file, keyname):
    key = bucket.new_key(prefix + '/' + keyname)
    cache_control = cache_control_default
    for pattern in cache_control_exceptions:
        if fnmatch(keyname, pattern):
            cache_control = cache_control_exceptions[pattern]
    key.set_metadata('Cache-Control', cache_control)
    key.set_contents_from_filename(file)
    print file, keyname, cache_control


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print 'usage: %s build-dir' % sys.argv[0]
        sys.exit(1)
    if not os.path.isdir(sys.argv[1]):
        print '%s is not a directory' % sys.argv[1]
        sys.exit(1)

    upload_dir(sys.argv[1])
