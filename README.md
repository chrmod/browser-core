navigation-extension
====================

Firefox Navigation Browser extension

# Packaging and publishing

To generate a stable version from source run `fab package`. For the beta version
run `fab package:beta=True`. These tasks will generate a .xpi addon files. The
difference between them is that the stable version is generated from the latest
git tag and the beta version from the latest commit (HEAD).

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
NOTE: We should keep this format of specifying versions d.d.dd. This will allow
us not to worry about automatic updates. Even if we land on AMO we are following
all the versioning rules to have 2 channels (beta and stable) and we don't need
to change anything.
```
To publish a stable version to CDN run `fab publish`. For the beta version
run `fab publish:beta=True`. This will package the extension. Generate a update
manifest file that is used by installed extensions to check for newer versions.
Upload the newer version to S3 and replace the old manifest file with the new one.

This automatic versioning allows us to publish by mistake and not change anything
because the stable version is always taken from a tag. If we don't explicitly tag
something with a version it will only get shipped to beta users.

# Settings

1. Navigate to `about:config`
2. Filter for `extensions.cliqz.`
3. Preferences:
``` bash
    "UDID": "1234567890|12345", //unique identifier
    "messageInterval": 3600000 , // interval between update messages - 1H
    "showQueryDebug": false, // show query debug information next to results
    "showDebugLogs": false, // show debug logs in console
    "popupHeight": 165, // popup (dropdown) height in pixels (requires restart)
    "dnt": false, // if set to true the extension will not send any tracking signals
```

# Logging

The extension sends the following list of data points

### Environment
Sent at startup and every 1 hour afterwards

``` bash
{
    "UDID": "<RANDOM_ID>",
    "startup": false,  // if this signal is sent at browser startup or during a regular interval
    "ts": <UNIX_TIMESTAMP>, // UNIX timestamp + ms (last 3 digits) eg: 1395151314278
    "agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:27.0) Gecko/20100101 Firefox/27.0", // user agent from the browser
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

Glossary

``` bash
  <ENCODED_RESULT_TYPE>

 - T-tab result, B-bookmark, H-history
 - any combination of one or more for vertical results:
    p - people
    c - census
    n - news
    w - weather
    d - cache
    e - english
    f - french
    v - video
    h - hq
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


  <RANDOM_ID>
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



     eg: 10378300660576423|16148|OO"
```


Keystoke - any key stroke which triggers a search
``` bash
{
    "action": "key_stroke",
    "type": "activity",
    "current_length": 2, //current length on the query/url from the urlbar
    "UDID": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>
}
```

Arrow key (up/down) - navigation through the results with keyboard

``` bash
{
    "UDID": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>,
    "type": "activity",
    "action": "arrow_key",
    "current_position": 1, // -1 = landed in the urlbar, 0 = the first result, 1 = the second result ...
    "position_type": "<ENCODED_RESULT_TYPE>",
    "search": true/false, //only if position_type = cliqz_results/history/bookmark/tab_result and the url is a search page
}
```

Result click (mouse)

``` bash
{
    "UDID": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>,
    "type": "activity",
    "action": "result_click",
    "new_tab": true/false, // is the result open in new tab
    "current_position": "1", // 0 = the first result, 1 = the second result ...
    "position_type": "<ENCODED_RESULT_TYPE>",
    "search": true/false, //only if position_type = cliqz_results/history/bookmark/tab_result and the url is a search page
}
```

Result enter (keyboard)

1. With a focused result
``` bash
{
    "UDID": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>,
	"type": "activity",
    "action": "result_enter",
    "current_position": 1, // 0 = the first result, 1 = the second result ...
    "position_type": "cliqz_results" // type of result on which the user landed (cliqz_results/cliqz_suggestions/history/bookmark/tab_result)
    "search": true/false, //only if position_type = cliqz_results/history/bookmark/tab_result and the url is a search page
}
```
2. With no focused result - in the urlbar
``` bash
{
    "UDID": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>,
    "type": "activity",
    "action": "result_enter",
    "current_position": -1,
    "position_type": "inbar_url"/"inbar_query",
    // inbar_url = the typed value looks like an url and it should load on enter
    // inbar_query = the typed value looks like a quer and it should load in the default search engine
    "autocompleted": true/false, // true - if the url or the query was autocompleted with the first result
    "source": "<ENCODED_RESULT_TYPE>", // encoded results type of the result which autocompleted
    "search": true/false, //only if position_type = inbar_url and the url is a search page
}
```

Results - results shown in the dropdown
``` bash
{
    "type": "activity",
    "action": "results",
	"result_order": "[<ENCODED_RESULT_TYPE>|<ENCODED_RESULT_TYPE>|...]" // list of encoded result type (after mixing) separated by '|'
    "UDID": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>
}
```

Suggestions - suggestions shown in the dropdown
``` bash
{
    "type": "activity",
    "action": "suggestions",
    "count": 2 // number of suggestions shown
    "UDID": "<RANDOM_ID>",
    "ts": <UNIX_TIMESTAMP>
}
```

Urlbar focus - user clicks in the url bar
``` bash
{
    "action": "urlbar_focus",
    "UDID": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Last search button pressed
``` bash
{
    "action": "last_search",
    "UDID": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Visual hash tag
``` bash
{
    "action": "visual_hash_tag",
    "UDID": "<RANDOM_ID>",
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
    "UDID": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Dropdown open
``` bash
{
    "action": "dropdown_open",
    "UDID": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Dropdown close
``` bash
{
    "action": "dropdown_close",
    "UDID": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Browser shutdown
``` bash
{
    "action": "browser_shutdown",
    "UDID": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Addon disable
``` bash
{
    "action": "addon_disable",
    "UDID": "<RANDOM_ID>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```
