import os
import sys
import argparse
import glob
import subprocess
import datetime
import json
import logging
import logging.config

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


def run_test(args, test_relpath):
    log.info('Running test %s', test_relpath)

    cmd = [
        args.browser_path,
        '-chrome', CHROME_URL + '?test=' + test_relpath,
        '-P', args.profile
    ]
    try:
        subprocess.check_call(cmd)
    except subprocess.CalledProcessError:
        log.exception('Error running command %s:', cmd)


def upload_test_results(args, uploader_path):
    # Read uploader options from json.config
    config_path = os.path.join(args.downloads_path, 'config.json')
    if not os.path.exists(config_path):
        log.error('Test did not generate %s!', config_path)
        return

    config = json.loads(open(config_path).read())
    upload_config = config.get('upload', {})

    cmd = [str(arg) for arg in [
        'python',
        uploader_path,
        '-i', args.downloads_path,
        '-o', args.output_path,
        '--bucket', args.bucket,
        '--key-prefix', args.key_prefix,
        '--dropdown-left', upload_config.get('dropdown_left', '32'),
        '--dropdown-top', upload_config.get('dropdown_top', '53'),
        '--dropdown-width', upload_config.get('dropdown_width', '502'),
        '--dropdown-height', upload_config.get('dropdown_height', '370'),
        '--mosaic-padding', upload_config.get('mosaic_padding', '1'),
        '--mosaic-cols', upload_config.get('mosaic_cols', '3'),
        '--mosaic-tiles', upload_config.get('mosaic_tiles', '100'),
        '--timestamp', args.timestamp
    ]]

    log.debug('Uploader command: %s', cmd)
    try:
        subprocess.check_call(cmd)
    except subprocess.CalledProcessError:
        log.exception('Error running command %s:', cmd)


def cleanup_after_test(args):
    for glob_expr in (
        os.path.join(args.downloads_path, 'dropdown*.png'),
        os.path.join(args.downloads_path, 'config.json'),
    ):
        for filename in glob.glob(glob_expr):
            os.remove(filename)


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
        run_test(args, test_relpath)
        upload_test_results(args, uploader_path)
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
    parser.add_argument('--bucket',
                        dest='bucket', help='bucket to upload files to',
                        default='tests-dropdown-appearance')
    parser.add_argument('--key-prefix',
                        dest='key_prefix', help='folder in the --bucket to upload screenshots to',
                        default='')
    parser.add_argument('--timestamp',
                        dest='timestamp', help='timestamp to use for uploading files',
                        default=default_ts)

    sys.exit(main(parser.parse_args()))
