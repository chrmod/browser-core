"""
    Manages packaging, deplyment and testing of the navigation extension.
"""

import urllib2
import xml.etree.ElementTree as ET

from fabric.contrib import console
from fabric.api import task, local, lcd, hide
from fabric.utils import abort
from jinja2 import Environment, FileSystemLoader

NAME = "Cliqz"
PATH_TO_EXTENSION = "cliqz@cliqz.com"
PATH_TO_S3_BUCKET = "s3://cdncliqz/update/"
PATH_TO_S3_BETA_BUCKET = "s3://cdncliqz/update/beta/"
XML_EM_NAMESPACE = "http://www.mozilla.org/2004/em-rdf#"
AUTO_INSTALLER_URL = "http://localhost:8888/"


def get_version(beta='True'):
    """Returns the extension's version string.

    The returned version will be constructed from the biggest version tag. If
    the beta argument is set to True the returned version will have a .1bN
    appended to the end, where N is the number of commits from last tag (e.g.
    0.4.08.1b123)."""

    full_version = local("git describe --tags", capture=True)  # e.g. 0.4.08-2-gb4f9f56
    version_parts = full_version.split("-")
    version = version_parts[0]
    if beta == 'True':
        # If the number of commits after a tag is 0 the returned versions have
        # no dashes (e.g. 0.4.08)
        try:
            version = version + ".1b" + version_parts[1]
        except IndexError:
            version = version + ".1b0"
    return version


@task
def package(beta='True'):
    """Package the extension as a .xpi file."""
    version = get_version(beta)

    # If we are not doing a beta release we need to checkout the latest stable tag
    if not (beta == 'True'):
        with hide('output'):
            # Because the file install.rdf changes after generating from template
            # we need to untrack it before we can do a stash-pop.
            local("git update-index --assume-unchanged cliqz@cliqz.com/install.rdf")
            # Get the name of the current branch so we can get back on it
            branch = local("git rev-parse --abbrev-ref HEAD", capture=True)
            # If we have changes stash them before checkout
            branch_dirty = local("git diff --shortstat", capture=True)
            if branch_dirty:
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
    if not (beta == 'True'):
        with hide('output'):
            local("git checkout %s" % branch)
            if branch_dirty:
                local("git stash pop")

    return output_file_name


@task
def install_in_browser(beta='True'):
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
def publish(beta='True'):
    """Upload extension to s3 (credentials in ~/.s3cfg need to be set to primary)"""

    if beta == 'True':
        if not console.confirm('You are going to update the extension '\
                               'for BETA users. Do you want to continue?'):
            return
    else:
        if not console.confirm('You are going to update the extension '\
                               'for ALL users. Do you want to continue?'):
            return

    update_manifest_file_name = "latest.rdf"
    latest_html_file_name = "latest.html"
    output_file_name = package(beta)
    path_to_s3 = PATH_TO_S3_BETA_BUCKET if beta == 'True' else PATH_TO_S3_BUCKET
    local("s3cmd --acl-public put %s %s" % (output_file_name, path_to_s3))

    env = Environment(loader=FileSystemLoader('templates'))
    manifest_template = env.get_template(update_manifest_file_name)
    version = get_version()
    if beta == 'True':
        download_link = "https://s3.amazonaws.com/cdncliqz/update/beta/%s" % output_file_name
    else:
        download_link = "https://s3.amazonaws.com/cdncliqz/update/%s" % output_file_name
    output_from_parsed_template = manifest_template.render(version=version,
                                                           download_link=download_link)
    with open(update_manifest_file_name, "wb") as f:
        f.write(output_from_parsed_template.encode("utf-8"))
    local("s3cmd -m 'text/rdf' --acl-public put %s %s" % (update_manifest_file_name,
                                                          path_to_s3))
    local("rm  %s" % update_manifest_file_name)

    # Provide a link to the latest stable version
    if not (beta == 'True'):
        latest_template = env.get_template(latest_html_file_name)
        output_from_parsed_template = latest_template.render(download_link=download_link)
        with open(latest_html_file_name, "wb") as f:
            f.write(output_from_parsed_template.encode("utf-8"))
        local("s3cmd --acl-public put %s %s" % (latest_html_file_name,
                                                path_to_s3))
        local("rm  %s" % latest_html_file_name)


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
