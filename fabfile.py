"""
    Manages packaging, deplyment and testing of the navigation extension.
"""

import urllib2
import xml.etree.ElementTree as ET

from fabric.api import task, local, lcd, hide
from fabric.utils import abort

NAME = "cliqz@cliqz"
PATH_TO_EXTENSION = "cliqz@cliqz.com"
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
    version = get_version()
    output_file_name = "%s.%s.xpi" % (NAME, version)
    with lcd(PATH_TO_EXTENSION):  # We need to be inside the folder when using zip
        with hide('output'):
            local("zip  %s -r * -x '*.DS_Store' -x '.*'"% output_file_name)
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
