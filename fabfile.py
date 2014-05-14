"""
    Manages packaging, deplyment and testing of the navigation extension.
"""

import urllib2
import xml.etree.ElementTree as ET

from fabric.api import task, local, lcd, hide
from fabric.utils import abort
from jinja2 import Environment, FileSystemLoader

NAME = "cliqz@cliqz"
PATH_TO_EXTENSION = "cliqz@cliqz.com"
PATH_TO_S3_BUCKET = "s3://cdncliqz/update/"
XML_EM_NAMESPACE = "http://www.mozilla.org/2004/em-rdf#"
AUTO_INSTALLER_URL = "http://localhost:8888/"


def get_version():
    """Returns the version from the install.rdf file."""
    install_rdf_path = "%s/install.rdf" % PATH_TO_EXTENSION
    xml_tree = ET.parse(install_rdf_path)
    xml_root = xml_tree.getroot()
    xml_description_element = xml_root.getchildren()[0]
    xml_version_element = xml_description_element.find("{%s}version" % XML_EM_NAMESPACE)
    return xml_version_element.text


@task
def package():
    """Package the extension as a .xpi file."""
    exclude_files = "--exclude=*.DS_Store*"
    version = get_version()
    output_file_name = "%s.%s.xpi" % (NAME, version)
    with lcd(PATH_TO_EXTENSION):  # We need to be inside the folder when using zip
        with hide('output'):
            local("zip  %s %s -r *" % (exclude_files, output_file_name))
            local("mv  %s .." % output_file_name)  # Move back to root folder
    return output_file_name


@task
def install_in_browser():
    """Install the extension in firefox. Firefox needs the Extension Auto-Installer add-on.
       https://addons.mozilla.org/en-US/firefox/addon/autoinstaller/"""
    output_file_name = package()
    data = open(output_file_name).read()
    try:
        response = urllib2.urlopen(AUTO_INSTALLER_URL, data)
    except urllib2.HTTPError as exception:
        if exception.code == 500:
            pass  # Success (Extension Auto-Installer returns 500)
    except urllib2.URLError as exception:
        abort("Extension Auto-Installer not running :(")


@task
def publish():
    """Upload extension to s3 (credentials in ~/.s3cfg need to be set to primary)"""
    output_file_name = package()
    latest_file_name = "latest.rdf"
    local("s3cmd --acl-public put %s %s" % (output_file_name, PATH_TO_S3_BUCKET))

    env = Environment(loader=FileSystemLoader('templates'))
    template = env.get_template('latest.rdf')
    version = get_version()
    download_link = "https://s3.amazonaws.com/cdncliqz/update/%s" % output_file_name
    # TODO: Extract and pass also min and max version information to the template.
    #       Right now it's hardcoded and needs to be changed every time.
    output_from_parsed_template = template.render(version=version,
                                                  download_link=download_link)
    with open(latest_file_name, "wb") as f:
        f.write(output_from_parsed_template)
    local("s3cmd -m 'text/rdf' --acl-public put %s %s" % (latest_file_name, PATH_TO_S3_BUCKET))
    # Delete generated file after upload
    local("rm  %s" % latest_file_name)


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
