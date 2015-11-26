import ast
import os
import sys
import argparse
import glob
import subprocess
import datetime
import json
import logging
import logging.config
import uuid
import re
import shutil
from boto.exception import S3ResponseError
from boto.s3.connection import S3Connection
from boto.ses.connection import SESConnection
from email.mime.image import MIMEImage
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


CHROME_URL = 'chrome://cliqztests/content/screenshots/run.html'

logging.config.dictConfig({
    'version': 1,
    'loggers': {
        '': {
            'handlers': ['default'],
            'level': 'DEBUG',
        },
    },
    'handlers': {
        'default': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
            'stream': 'ext://sys.stderr',
        },
    },
    'formatters': {
        'standard': {
            'format': '%(asctime)s [%(process)s] [%(levelname)s] %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
})
log = logging.getLogger(__name__)


def render_mosaic(args, config):
    mosaic_file_name = os.path.join(
        args.output_path, args.timestamp, config['name'], 'mosaic', 'mosaic-000.png'
    )
    s3_key_path = '/'.join([c for c in
        [args.key_prefix, args.timestamp, config['name'], 'mosaic', 'mosaic-000.png']
        if c
    ])
    s3_path = 's3://%s/%s' % (args.bucket, s3_key_path)

    msg_rel = MIMEMultipart('related')
    msg_alt = MIMEMultipart('alternative')
    msg_rel.attach(msg_alt)

    html = '<html><body>%s<br/><br/><img src="cid:%s" /></body></html>' % (s3_path, s3_key_path)
    msg_alt.attach(MIMEText(html, 'html'))
    msg_alt.attach(MIMEText(s3_path, 'plain'))

    with open(mosaic_file_name, 'rb') as fp:
        img = MIMEImage(fp .read())
        img.add_header('Content-ID', s3_key_path)
        img.add_header('Content-Disposition', 'attachment')
        msg_rel.attach(img)

    return msg_rel


# Mapping email template names to their rendering functions
# Every function should accept (args, config) and return message object ready to be sent
EMAIL_TEMPLATES = {
    'mosaic': render_mosaic,
    'default': render_mosaic,
}


def prepare_dynamic_test(args, test_content):
    match = re.search(r'.*queries_source:\s*s3://([^/]*)/(.*)\b.*',
                      test_content)
    if match and len(match.groups()) == 2:
        bucket_name, key_name = match.groups()
        log.debug('Loading queries from "%s/%s"' %
                  (bucket_name, key_name))
        try:
            connection = S3Connection()
            bucket = connection.get_bucket(bucket_name)
            queries = set()
            for key in bucket.list(key_name):
                log.debug('Loading query file "%s"' % key.name)
                try:
                    queries.update(json.loads(key.get_contents_as_string()))
                    log.debug('Number of queries: %d' % len(queries))
                    bucket.delete_key(key)
                except ValueError:
                    log.info('Error decoding JSON queries')
            if queries:
                return re.sub(r'(.*queries:\s*)\[\](.*)',
                              r'\1' + json.dumps(list(queries)) + r'\2',
                              test_content)
        except (S3ResponseError, IOError) as e:
            log.error('Error loading queries: %s' % str(e))
    else:
        log.error('No source found')

    return None


def run_test(args, test_relpath):
    log.info('Running test %s', test_relpath)

    cur_dir_path = os.path.abspath(os.path.dirname(__file__))
    tests_path = os.path.join(cur_dir_path, args.tests)
    test_abspath = os.path.join(cur_dir_path, test_relpath)
    dyn_test_abspath = os.path.join(tests_path, '_dyn_test')
    dyn_text_relpath = os.path.relpath(dyn_test_abspath, cur_dir_path)

    is_dyn_test = False
    is_dyn_test_active = False
    test_content = open(test_abspath).read()
    if 'queries_source' in test_content:
        log.debug('Found dynamic test "%s"' % test_relpath)
        is_dyn_test = True
        dyn_test_content = prepare_dynamic_test(args, test_content)
        if dyn_test_content:
            with open(dyn_test_abspath, 'w') as f:
                f.write(dyn_test_content)
            test_relpath = dyn_text_relpath
            is_dyn_test_active = True

    if not is_dyn_test or (is_dyn_test and is_dyn_test_active):
        cmd = [
            args.browser_path,
            '-chrome', CHROME_URL + '?test=' + test_relpath,
            '-P', args.profile
        ]
        try:
            subprocess.check_call(cmd)
        except subprocess.CalledProcessError:
            log.exception('Error running command %s:', cmd)
    else:
        log.info('Not running "%s"' % test_relpath)

    if is_dyn_test and is_dyn_test_active:
        os.remove(dyn_test_abspath)


def upload_test_results(args, config, uploader_path):
    upload_config = config.get('upload', {})

    params = [
        'python',
        uploader_path,
        '-i', args.downloads_path,
        '-o', args.output_path,
        '-t', config['name'],
        '-f', '*.png',
        '--bucket', upload_config.get('bucket', args.bucket),
        '--key-prefix', upload_config.get('key_prefix', args.key_prefix),
        '--dropdown-left', upload_config.get('dropdown_left', '32'),
        '--dropdown-top', upload_config.get('dropdown_top', '53'),
        '--dropdown-width', upload_config.get('dropdown_width', '502'),
        '--dropdown-height', upload_config.get('dropdown_height', '370'),
        '--mosaic-padding', upload_config.get('mosaic_padding', '1'),
        '--mosaic-cols', upload_config.get('mosaic_cols', '3'),
        '--mosaic-tiles', upload_config.get('mosaic_tiles', '100'),
        '--timestamp', args.timestamp,
        '--keep-files'
    ]

    if upload_config.get('flat_upload', False):
        params.append('--flat-upload')
    if upload_config.get('no_mosaic', False):
        params.append('--no-mosaic')
    if upload_config.get('public_read', False):
        params.append('--public-read')

    cmd = [str(arg) for arg in params]

    log.debug('Uploader command: %s', cmd)
    try:
        subprocess.check_call(cmd)
    except subprocess.CalledProcessError:
        log.exception('Error running command %s:', cmd)


def send_emails(args, config):
    template = config.get('template', 'default')
    if template not in EMAIL_TEMPLATES:
        log.error('No handler for mail template "%s" found, skip sending emails', template)
        return

    if 'emails' not in config:
        log.error('No emails found in config, skip sending emails')
        return

    handler = EMAIL_TEMPLATES[template]
    msg = handler(args, config)
    msg['From'] = 'dominik.s@cliqz.com'
    msg['To'] = ','.join(config['emails'])
    if 'subject' in config:
        msg['Subject'] = config['subject']
    else:
        msg['Subject'] = 'Test results for %s (%s)' % (args.timestamp, config['name'])

    conn = SESConnection(
        aws_access_key_id='AKIAJFBODEFNZWT3PITQ',
        aws_secret_access_key='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'
    )
    conn.send_raw_email(msg.as_string())
    log.debug('Sent "%s" mail for test %s to %s',
              template, config['name'], config['emails'])


def cleanup_after_test(args):
    for glob_expr in (
        os.path.join(args.downloads_path, '*.png'),
        os.path.join(args.downloads_path, 'config.json'),
    ):
        for filename in glob.glob(glob_expr):
            log.debug('Removing file %s', filename)
            os.remove(filename)

    output_folder = os.path.join(args.output_path, args.timestamp)
    log.debug('Removing directory %s', output_folder)
    if os.path.exists(output_folder):
        shutil.rmtree(output_folder)


def get_test_groups(test_abspath):
    test = open(test_abspath).read()
    match = re.search(r'test_groups:\s*(\[[^\]]*\])', test)

    groups = []
    if match and len(match.groups()) == 1:
        try:
            groups = ast.literal_eval(match.group(1))
        except SyntaxError:
            log.error('Could not parse test groups for %s', test_abspath)
    return groups


def main(args):
    # Get test names
    cur_dir_path = os.path.abspath(os.path.dirname(__file__))
    tests_path = os.path.join(cur_dir_path, args.tests)

    if not os.path.exists(tests_path):
        raise IOError('Path %s does not exist!' % (tests_path,))

    log.info('Running tests from %s', tests_path)
    if os.path.isfile(tests_path):
        # one test file specified
        files_to_run = [args.tests]
    else:
        # test directory specified
        files_to_run = glob.glob(os.path.join(tests_path, '*.js'))
        files_to_run = [os.path.relpath(f, cur_dir_path) for f in files_to_run]

    log.debug('Will run tests: %s', files_to_run)

    uploader_path = os.path.join(cur_dir_path, 'upload.py')

    for test_relpath in files_to_run:
        test_groups = get_test_groups(os.path.join(cur_dir_path, test_relpath))
        if args.test_group and args.test_group not in test_groups:
            log.info('Skipping test %s because it is not in active test group',
                     test_relpath)
            continue

        run_test(args, test_relpath)

        config_path = os.path.join(args.downloads_path, 'config.json')
        if os.path.exists(config_path):
            config = json.loads(open(config_path).read())
            # If test authors didn't provide us with a test name, generate one
            if 'name' not in config:
                config['name'] = str(uuid.uuid4()).replace('-', '')[:10]

            upload_test_results(args, config, uploader_path)
            send_emails(args, config)
        else:
            log.error('Test did not generate %s, skip uploading & sending emails', config_path)

        if not args.keep_files:
            cleanup_after_test(args)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Runner for screenshot tests')
    default_ts = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    parser.add_argument('-t', '--tests',
                        dest='tests', help='directory or file with test, e.g. "active"',
                        default='active')
    parser.add_argument('-p', '--profile',
                        dest='profile', help='browser profile',
                        default='cliqz-screenshot')
    parser.add_argument('-b', '--browser-path',
                        dest='browser_path', help='browser executable path',
                        default=r'C:\browsers\firefox\39.0\firefox.exe')
    parser.add_argument('-d', '--downloads-path',
                        dest='downloads_path', help='default downloads path',
                        default=r'C:\Users\vagrant\Downloads')
    parser.add_argument('-o', '--output-path',
                        dest='output_path', help='output directory for uploader, a temp folder',
                        default=r'C:\temp')
    parser.add_argument('--keep-files', action='store_true',
                        dest='keep_files', help='do not delete local screenshots',
                        default=False)
    parser.add_argument('--bucket',
                        dest='bucket', help='bucket to upload files to',
                        default='tests-dropdown-appearance')
    parser.add_argument('--key-prefix',
                        dest='key_prefix', help='folder in the --bucket to upload screenshots to',
                        default='')
    parser.add_argument('--timestamp',
                        dest='timestamp', help='timestamp to use for uploading files',
                        default=default_ts)
    parser.add_argument('--test-group',
                        dest='test_group', help='includes only tests of this test group',
                        default=None)

    sys.exit(main(parser.parse_args()))
