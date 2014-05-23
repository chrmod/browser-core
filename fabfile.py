"""
    Manages packaging, deplyment and testing of the navigation extension.
"""

import urllib2
import xml.etree.ElementTree as ET

from fabric.api import task, local, lcd, hide
from fabric.utils import abort
from jinja2 import Environment, FileSystemLoader

NAME = "Cliqz"
PATH_TO_EXTENSION = "cliqz@cliqz.com"
PATH_TO_S3_BUCKET = "s3://cdncliqz/update/"
PATH_TO_S3_BETA_BUCKET = "s3://cdncliqz/update/beta/"
XML_EM_NAMESPACE = "http://www.mozilla.org/2004/em-rdf#"
AUTO_INSTALLER_URL = "http://localhost:8888/"


def get_version(beta=False):
    """Returns the extension's version string.

    The returned version will be constructed from the biggest version tag. If
    the beta argument is set to True the returned version will have a .1bN
    appended to the end, where N is the number of commits from last tag (e.g.
    0.4.08.1b123)."""

    full_version = local("git describe --tags", capture=True)  # e.g. 0.4.08-2-gb4f9f56
    version_parts = full_version.split("-")
    version = version_parts[0]
    if beta:
        # If the number of commits after a tag is 0 the returned versions have
        # no dashes (e.g. 0.4.08)
        try:
            version = version + ".1b" + version_parts[1]
        except IndexError:
            version = version + ".1b0"
    return version


@task
def package(beta=False):
    """Package the extension as a .xpi file."""
    version = get_version(beta)

    # If we are not doing a beta release we need to checkout the latest stable tag
    if not beta:
        with hide('output'):
            local("git stash")
            local("git checkout %s" % (version))

    # Generate temporary manifest
    install_manifest_path = "cliqz@cliqz.com/install.rdf"
    env = Environment(loader=FileSystemLoader('templates'))
    template = env.get_template('install.rdf')
    output_from_parsed_template = template.render(name=NAME,
                                                  version=version,
                                                  beta=beta)
    with open(install_manifest_path, "wb") as f:
        f.write(output_from_parsed_template.encode("utf-8"))

    # Zip extension
    output_file_name = "%s.%s.xpi" % (NAME, version)
    with lcd(PATH_TO_EXTENSION):  # We need to be inside the folder when using zip
        with hide('output'):
            exclude_files = "--exclude=*.DS_Store*"
            local("zip  %s %s -r *" % (exclude_files, output_file_name))
            local("mv  %s .." % output_file_name)  # Move back to root folder

    # If we checked out a earlier commit we need to go back to master/HEAD
    if not beta:
        with hide('output'):
            local("git checkout -f master")
            local("git stash pop")

    return output_file_name


@task
def install_in_browser(beta=False):
    """Install the extension in firefox.

    Firefox needs the Extension Auto-Installer add-on.
    https://addons.mozilla.org/en-US/firefox/addon/autoinstaller/"""

    output_file_name = package(beta)
    data = open(output_file_name).read()
    try:
        response = urllib2.urlopen(AUTO_INSTALLER_URL, data)
    except urllib2.HTTPError as exception:
        if exception.code == 500:
            pass  # Success (Extension Auto-Installer returns 500)
    except urllib2.URLError as exception:
        abort("Extension Auto-Installer not running :(")


@task
def publish(beta=False):
    """Upload extension to s3 (credentials in ~/.s3cfg need to be set to primary)"""
    update_manifest_file_name = "latest.rdf"
    output_file_name = package(beta)
    path_to_s3 = PATH_TO_S3_BETA_BUCKET if beta else PATH_TO_S3_BUCKET
    local("s3cmd --acl-public put %s %s" % (output_file_name, path_to_s3))

    env = Environment(loader=FileSystemLoader('templates'))
    template = env.get_template(update_manifest_file_name)
    version = get_version()
    if beta:
        download_link = "https://s3.amazonaws.com/cdncliqz/update/beta/%s" % output_file_name
    else:
        download_link = "https://s3.amazonaws.com/cdncliqz/update/%s" % output_file_name
    output_from_parsed_template = template.render(version=version,
                                                  download_link=download_link)
    with open(update_manifest_file_name, "wb") as f:
        f.write(output_from_parsed_template.encode("utf-8"))
    local("s3cmd -m 'text/rdf' --acl-public put %s %s" % (update_manifest_file_name,
                                                          path_to_s3))
    # Delete generated file after upload
    local("rm  %s" % update_manifest_file_name)


@task
def test():
    """Run mozmill tests from tests folder."""
    firefox_binary_path = "/Applications/Firefox.app/Contents/MacOS/firefox"
    tests_folder = 'tests/mozmill/'
    output_file_name = package()
    local("mozmill --test=%s --addon=%s --binary=%s" % (tests_folder, output_file_name,
                                                        firefox_binary_path))


@task
def clean():
    """Clean directory from .xpi files"""
    local("rm  *.xpi")
