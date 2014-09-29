navigation-extension
====================

Firefox Navigation Browser extension

# Packaging and publishing

To generate a stable version from source run `fab package:beta=False`. The default
version (`fab package`) will always be a beta version. These tasks will generate
a .xpi addon files. The difference between them is that the stable version is
generated from the latest git tag (on the current branch) and the beta version
from the latest commit.

Another difference between stable and beta is that the stable version gets updates
from stable channel and beta from beta channel. So we need to be careful to not
package a beta version if we send it to normal users.

The version is calculated from GIT tags. If we want to declare a commit stable
we give it a tag with a higher version number than the previous one (e.g. if
the last version was 0.4.08 we increment it to 0.4.09).
```
NOTE: In default git remote configuration you have to push tags explicitly.
It is recommended to push single tags that we added with `git push <remote> tag <tagname>`.
We should also explicitly get tags from remote repositories with `git fetch <remote> --tags`.
```
The beta version will append .1bN to the end (N is the commit count from last
stable version). If we made 5 commits from last stable tag (0.4.09) it will be
0.4.09.1b5.
```
If we want to set explicitly the version we can use the version argument. E.g. we
want to package a stable version on the branch we are on with the tag 0.5.25:
`fab package:beta=False,version=0.5.25`

NOTE: We should keep this format of specifying versions d.d.dd. This will allow
us not to worry about automatic updates. Even if we land on AMO we are following
all the versioning rules to have 2 channels (beta and stable) and we don't need
to change anything.
```
To publish a stable version to CDN run `fab publish:beta=False`. For the beta
version run `fab publish:beta=True` or just `fab publish`. This will package the
extension. Generate a update manifest file that is used by installed extensions
to check for newer versions. Upload the newer version to S3 and replace the old
manifest file with the new one.

This automatic versioning should allow us to recover from mistakes faster because
we have always all published versions tagged and we can easily revert to old ones.
And we always know what commit is deployed in production.

# Settings

1. Navigate to `about:config`
2. Filter for `extensions.cliqz.`
3. Preferences:
``` bash
    "session": "1234567890|12345", //unique identifier
    "messageInterval": 3600000 , // interval between update messages - 1H
    "showQueryDebug": false, // show query debug information next to results
    "showDebugLogs": false, // show debug logs in console
    "popupHeight": 165, // popup (dropdown) height in pixels (requires restart)
    "dnt": false, // if set to true the extension will not send any tracking signals
    "forceCountry": "fr", // force mixer to return results as if we are in this country
```

# Logging


Glossary

``` bash
  "<ENCODED_RESULT_TYPE>"

 - T-tab result, B-bookmark, H-history, S-series, C-cluster, X - fun
 - any combination of one or more for vertical results:
    p - people
    c - census
    n - news
    w - weather
    b - bundesliga
    d - cache
    e - english
    f - french
    v - video
    h - hq
    k - science
    q - qaa
    l - dictionary
    s - shopping
- any of the folowing for custom search engine search
    1 - google images
    2 - google maps
    3 - google
    4 - yahoo
    5 - bing
    6 - wikipedia
    7 - amazon
    8 - ebay
    9 - leo
    0 - other
```

``` bash
  "<RANDOM_ID>"
     Random sequence - aprox 16 digits
     | - separator
     number of days since (GMT: Thu, 01 Jan 1970 00:00:00 GMT) - unix timestamp - 5 digits eg:  16474
     | - separator
     CHANNEL-ID
         - 00 - cliqz
         - 01 - CHIP installer
         - 02 - CHIP store
         - 03 - Softonic
         - 04 - AMO (Mozilla Firefox Store)
         - 05 -
         - 06 - Chip editorial activities
         - 07 - Chip editor’s suggestion box
         - 08 - Chip display advertising
         - 09 - French version
         - 10 -
         - 11 - Provided to Thomas K
         - 12 - Provided to Thomas K
         - 13 - Provided to Thomas K
         - 14 - Provided to Thomas K
         - 15 - Provided to Thomas K
         - 16 - Provided to Thomas K
         - 17 - Provided to Thomas K
         - 18 - Provided to Thomas K
         - 19 - Provided to Thomas K
     eg: 10378300660576423|16148|OO
```

``` bash
  "<UNIX_TIMESTAMP>"
    UNIX timestamp + ms (last 3 digits)
    eg: 1395151314278
```

The extension sends the following list of data points

### Environment
Sent at startup and every 1 hour afterwards

``` bash
{
    "session": "<RANDOM_ID>",
    "startup": false,  // if this signal is sent at browser startup or during a regular interval
    "ts": <UNIX_TIMESTAMP>,
    "agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:27.0) Gecko/20100101 Firefox/27.0", // user agent from the browser
    "height": 1280, // height of current document (i.e., content frame)
    "width": 722, // width of current document
    "history_urls": 1518, // number of history points from the browser
    "version": "0.3.0.preview", // exact version of the browser extension
    "history_days": 37, // days since the first history data point
    "type": "environment", // signal type
    "prefs": {...} // a snapshot of the current preferences described in Settings
}
```

### Timings
Sent with the 'environment' signal if the preference `extensions.cliqz.logTimings` is set to true (defaults to unset).

``` bash
{
    "type": "timing",
    "name": "<NAME OF TIMER>",
    "histogram": // a list of buckets with counts (i.e., how many times the timing fits in the bucket)
        // for example: bucket "100" contains a count of the timings that were >= 100 and < 200
        {"0":0, "100":2, "200":2, "300":4 ,"400":1, "500":0, "600":0, "700":0, "800":0, "900":0, "1000":0}}
}
```

### Actions

Keystoke - any key stroke which triggers a search
``` bash
{
    "action": "key_stroke",
    "type": "activity",
    "current_length": 2, //current length on the query/url from the urlbar
    "session": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>
}
```

Arrow key (up/down) - navigation through the results with keyboard

``` bash
{
    "session": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>,
    "type": "activity",
    "action": "arrow_key",
    "current_position": 1, // -1 = landed in the urlbar, 0 = the first result, 1 = the second result ...
    "position_type": "<ENCODED_RESULT_TYPE>",
    "search": true/false, //if the url is a search page
}
```

Arrow key (tab) - navigation through the suggestions with keyboard

``` bash
{
    "session": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>,
    "type": "activity",
    "action": "tab_key",
    "current_position": 1, // -1 = none, 0 = the first result, 1 = the second result ...
    "direction":"left"/"right"
}
```

Result click (mouse)

``` bash
{
    "session": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>,
    "type": "activity",
    "action": "result_click",
    "query_length": 2, //length of the query in the moment of this action
    "inner_link": true/false, the actual result was clicked or some inner link (eg. additional sources for news)
    "new_tab": true/false, // is the result open in new tab
    "current_position": "1", // 0 = the first result, 1 = the second result ...
    "position_type": "<ENCODED_RESULT_TYPE>",
    "extra": 'topic0', //extra information about the click - used for topic clustering, guessed series, ... + position
    "search": true/false, //if the url is a search page
    "has_image": true/false // result has an image (nobody image from xing is considered no image)
}
```

Suggestion click (mouse)

``` bash
{
    "session": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>,
    "type": "activity",
    "action": "suggestion_click",
    "query_length": 2, //length of the query in the moment of this action
    "current_position": 0
}
```

Result enter (keyboard)

1. With a focused result
``` bash
{
    "session": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>,
	"type": "activity",
    "action": "result_enter",
    "query_length": 2, //length of the query in the moment of this action
    "current_position": 1, // 0 = the first result, 1 = the second result ...
    "position_type": "<ENCODED_RESULT_TYPE>"
    "search": true/false, //if the url is a search page
    "has_image": true/false // result has an image (nobody image from xing is considered no image)
}
```
2.
 With no focused result - in the urlbar
``` bash
{
    "session": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>,
    "type": "activity",
    "action": "result_enter",
    "query_length": 2, //length of the query in the moment of this action
    "current_position": -1,
    "position_type": "inbar_url"/"inbar_query",
    // inbar_url = the typed value looks like an url and it should load on enter
    // inbar_query = the typed value looks like a quer and it should load in the default search engine
    "autocompleted": true/false, // true - if the url or the query was autocompleted with the first result
    "source": "<ENCODED_RESULT_TYPE>", // encoded results type of the result which autocompleted
    "search": true/false, //only if position_type = inbar_url and the url is a search page
}
```
3. With a focused suggestion
``` bash
{
    "session": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>,
    "type": "activity",
    "action": "suggestion_enter",
    "query_length": 2, //length of the query in the moment of this action
    "current_position": 1
}
```
Results - results shown in the dropdown
``` bash
{
    "type": "activity",
    "action": "results",
	"result_order": "[<ENCODED_RESULT_TYPE>|<ENCODED_RESULT_TYPE>|...]" // list of encoded result type (after mixing) separated by '|'
    "session": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>,
    "instant": true/false, // was this an 'instant' result or full result
    "popup": true/false, // if the result really got the chance to be displayed for the user
    "latency_backend": <TIME_MS>, // time in ms from start of search until the backend returns
    "latency_mixer": <TIME_MS>, // time in ms from start of search until the results are mixed
    "latency_all": <TIME_MS>, // time in ms from start of search until this result was shown
}
```

Suggestions - suggestions shown in the dropdown
``` bash
{
    "type": "activity",
    "action": "suggestions",
    "count": 2 // number of suggestions shown
    "session": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>
}
```

Urlbar focus - user clicks in the url bar
``` bash
{
    "action": "urlbar_focus",
    "session": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Last search button pressed
``` bash
{
    "action": "last_search",
    "session": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Visual hash tag
``` bash
{
    "action": "visual_hash_tag",
    "session": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>,
    "new_tab": true/false, // is the result open in new tab
    "engine": X,
       // ENGINE CODES
       //
       // 'google images'  = 1
       // 'google maps'    = 2
       // 'google'         = 3
       // 'yahoo'          = 4
       // 'bing'           = 5
       // 'wikipedia'      = 6
       // 'amazon'         = 7
       // 'ebay'           = 8
       // 'leo'            = 9
       // 'other'          = 0
}
```

Urlbar blur - url bar loses focus - user selects a result, click outside or browser looses focus
``` bash
{
    "action": "urlbar_blur",
    "session": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Dropdown open
``` bash
{
    "action": "dropdown_open",
    "session": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Offboarding page shown
``` bash
{
    "action": "offboarding_shown",
    "session": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Offboarding tour started
``` bash
{
    "action": "offboarding_tour",
    "session": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Offboarding page closed
``` bash
{
    "action": "offboarding_closed",
    "time": <SECONDS> # How long the user looked at the page before closing
    "session": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Dropdown close
``` bash
{
    "action": "dropdown_close",
    "session": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Browser shutdown
``` bash
{
    "action": "browser_shutdown",
    "session": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Addon disable
``` bash
{
    "action": "addon_disable",
    "session": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

### Performance
Result compare
``` bash
{
	"action": "result_compare",
    "session": "<RANDOM_ID>",
    "type": "performance",
    "ts": <UNIX_TIMESTAMP>
    "redirect": true/false, // if a google redirect was captured
    "query_made": 1, number of google queries made after last cliqz result shown
    "same_result": true, // found an ignored cliqz result,
    "result_position": 0, // null if same_result == false
    "result_type": "<ENCODED_RESULT_TYPE>" // null if same_result == false
    "popup": true/fasle // if our result had a chance to be displayed
}
```
