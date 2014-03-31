navigation-extension
====================

Firefox Navigation Browser extension

#Settings

1. Navigate to `about:config`
2. Filter for `extensions.cliqz.`
3. Preferences:
``` bash
    'UDID': '1234567890|12345', //unique identifier
    'messageInterval': 3600000 , // interval between update messages - 1H 
    'showQueryDebug': false, // show query debug information next to results
    'showDebugLogs': false, // show debug logs in console
    'popupHeight': 165, // popup (dropdown) height in pixels (requires restart)
    'betaGroup': false // if set to true the extension gets all the updates. Else only the major version
```

#Logging

The extension sends the following list of data points

### Environment 
Sent at startup and every 1 hour afterwards

``` bash
{
    "UDID": "<RANDOM_ID>|<5_DIGIT_DAYS_IDENTIFIER>",    //random ID + separator  + number of days since (GMT: Thu, 01 Jan 1970 00:00:00 GMT) - unix timestamp - 5 digits eg:     10378300660576423|16148"
    "startup": false,  // if this signal is sent at browser startup or during a regular interval
    "ts": <UNIX_TIMESTAMP>, // UNIX timestamp + ms (last 3 digits) eg: 1395151314278
    "agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:27.0) Gecko/20100101 Firefox/27.0", // user agent from the browser
    "history_urls": 1518, // number of history points from the browser
    "version": "0.3.0.preview", // exact version of the browser extension
    "history_days": 37, // days since the first history data point
    "type": "environment" // signal type
}
```

### Actions 

Keystoke - any key stroke which triggers a search
``` bash
{
    "action": "key_stroke",
    "type": "activity",
    "current_length": 2, //current length on the query/url from the urlbar
    "UDID": "<RANDOM_ID>|<5_DIGIT_DAYS_IDENTIFIER>",
    "ts": <UNIX_TIMESTAMP>
}
``` 

Arrow key (up/down) - navigation through the results with keyboard

``` bash
{
    "UDID": "<RANDOM_ID>|<5_DIGIT_DAYS_IDENTIFIER>",
    "ts": <UNIX_TIMESTAMP>,
    "type": "activity",
    "action": "arrow_key",
    "current_position": 1, // -1 = landed in the urlbar, 0 = the first result, 1 = the second result ...
    "position_type": "cliqz_results" // type of result on which the user landed (cliqz_results/cliqz_suggestions/history/bookmark/tab_result)
}
``` 


Result click (mouse)

``` bash
{
    "UDID": "<RANDOM_ID>|<5_DIGIT_DAYS_IDENTIFIER>",
    "ts": <UNIX_TIMESTAMP>,
    "type": "activity",
    "action": "result_click",
    "current_position": "1", // 0 = the first result, 1 = the second result ...
    "position_type": "cliqz_results" // type of result on which the user landed (cliqz_results/cliqz_suggestions/history/bookmark/tab_result)
}
``` 

Result enter (keyboard)

1. With a focused result
``` bash
{
    "UDID": "<RANDOM_ID>|<5_DIGIT_DAYS_IDENTIFIER>",
    "ts": <UNIX_TIMESTAMP>,
	"type": "activity",
    "action": "result_enter",
    "current_position": 1, // 0 = the first result, 1 = the second result ...
    "position_type": "cliqz_results" // type of result on which the user landed (cliqz_results/cliqz_suggestions/history/bookmark/tab_result)
}
``` 
2. With no focused result - in the urlbar
``` bash
{
    "UDID": "<RANDOM_ID>|<5_DIGIT_DAYS_IDENTIFIER>",
    "ts": <UNIX_TIMESTAMP>,
    "type": "activity",
    "action": "result_enter",
    "current_position": -1, 
    "position_type": "inbar_url"/"inbar_query",
    // inbar_url = the typed value looks like an url and it should load on enter
    // inbar_query = the typed value looks like a quer and it should load in the default search engine
    "autocompleted": true/false, // true - if the url or the query was autocompleted with the first result
}
``` 

Results - results shown in the dropdown
``` bash
{
    "type": "activity",
    "action": "results",
	"cliqz_results": 0,           // cliqz results with no snippet
	"cliqz_results_snippet": 5,   // cliqz results with snippet but no title
	"cliqz_results_title": 0,     // cliqz results with snippet and title
	"history_results": 2,         // history results
	"bookmark_results": 0,        // bookmark results
	"tab_results": 0              // tab results (page already open in one of the browser's tabs)
    "result_order": "TBBHRRRS"    // order of results after intermingle process: T-tab result, B-bookmark, H-history, R-cliqz result, S-suggestion
    "UDID": "<RANDOM_ID>|<5_DIGIT_DAYS_IDENTIFIER>",
    "ts": <UNIX_TIMESTAMP>
}
``` 

Urlbar focus - user clicks in the url bar
``` bash
{
    "action": "urlbar_focus",
    "UDID": "<RANDOM_ID>|<5_DIGIT_DAYS_IDENTIFIER>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
``` 

Urlbar blur - url bar loses focus - user selects a result, click outside or browser looses focus
``` bash
{
    "action": "urlbar_blur", 
    "UDID": "<RANDOM_ID>|<5_DIGIT_DAYS_IDENTIFIER>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
``` 

Dropdown open
``` bash
{
    "action": "dropdown_open", 
    "UDID": "<RANDOM_ID>|<5_DIGIT_DAYS_IDENTIFIER>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Dropdown close
``` bash
{
    "action": "dropdown_close", 
    "UDID": "<RANDOM_ID>|<5_DIGIT_DAYS_IDENTIFIER>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Browser shutdown
``` bash
{
    "action": "browser_shutdown", 
    "UDID": "<RANDOM_ID>|<5_DIGIT_DAYS_IDENTIFIER>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```

Addon disable
``` bash
{
    "action": "addon_disable", 
    "UDID": "<RANDOM_ID>|<5_DIGIT_DAYS_IDENTIFIER>",
    "type": "activity",
    "ts": <UNIX_TIMESTAMP>
}
```