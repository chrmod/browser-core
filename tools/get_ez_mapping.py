#!/usr/bin/env python

import json
import re
import urlparse
import requests


def extract_url(url):
    urlparts = urlparse.urlparse(url)
    url = urlparts.netloc.replace("www.", "")
    return url


rich_header_server = "http://rich-header-interface.clyqz.com/all_data"
#rich_header_server = "http://rich-header-interface.fbt.co/all_data"

ez_dump = requests.get(rich_header_server,
                       auth=('cliqz', 'cliqz-245'), verify=False).json()

urls = {}

for ez in ez_dump:
    # regex: "s:http://www.google.com"
    matches = re.match("^s:(http.+)", ez['regex'])
    if matches:
        url = matches.group(1)
        url = extract_url(url)
        urls[url] = ez['id']
        continue

    # regex: "f:Lindsay Lohan"
    matches = re.match("^f:(.+)", ez['regex'])
    if matches:
        continue

    # regex: "southpark.|Southpark|southpark.de|http://www.southpark|...''
    # by splitting on '|', finding the longest and assuming that's the URL
    query_list = ez['regex'].split('|')
    if len(query_list) > 1:
        longest = ""
        for q in query_list:
            matches = re.match("^http", q)
            if matches:
                if len(q) > len(longest):
                    longest = q
        url = extract_url(longest)
        if len(longest):
            urls[url] = ez['id']


# temporary overrides
urls['airberlin.com'] = "50212"
urls['youtube.com'] = "4000"

print json.dumps(urls, indent=4)
