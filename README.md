navigation-extension
====================

Firefox Navigation Browser extension


#Logging

The extension sends the following list of data points

### Environment 

``` bash
{
    "UDID": "10378300660576423|16148",    //random ID + separator  + number of days since (GMT: Thu, 01 Jan 1970 00:00:00 GMT) - unix timestamp - 5 digits
    "startup": false,  // if this signal is sent at browser startup or during a regular interval
    "ts": 1395151314278, // UNIX timestamp + ms (last 3 digits)
    "agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:27.0) Gecko/20100101 Firefox/27.0", // user agent from the browser
    "history_urls": 1518, // number of history points from the browser
    "version": "0.3.0.preview", // exact version of the browser extension
    "history_days": 37, // days since the first history data point
    "type": "environment" // signal type
}
```

2. action

eg1 - keystoke
{
    "action": "key_stroke",
    "UDID": "10378300660576423|16148",
    "type": "action",
    "ts": 1395151332340
}

eg2 - results shown
{
    "bookmarkResults": 0,
    "cliqzResults": 6,
    "UDID": "10378300660576423|16148",
    "historyResults": 20,
    "ts": 1395151332585,
    "action": "results",
    "type": "action"
}

(because this two happen at different moments in time it would be wiser to keep them separated. We can merge them if needed)

eg3 - arrow_key (keyboard)
{
    "action": "arrow_key",
    "currentPosition": 0, // 0 indexed position
    "UDID": "10378300660576423|16148",
    "type": "action",
    "ts": 1395151313585
}

eg4 - result click (mouse)
{
    "action": "result_click",
    "position": "19",  // 0 indexed position
    "UDID": "10378300660576423|16148",
    "type": "action",
    "ts": 1395151328286
}

eg5 - other actions 
{
    "action": "urlbar_focus", // user clicks in the url bar  - MIGHT BE USED AS SESSION START
    "UDID": "10378300660576423|16148",
    "type": "action",
    "ts": 1395151329786
}
{
    "action": "urlbar_blur", //url bar loses focus - user selects a resul, click outside or browser looses focus -  - MIGHT BE USED AS SESSION END
    "UDID": "10378300660576423|16148",
    "type": "action",
    "ts": 1395151334026
}
{
    "action": "dropdown_open", // drop down opens 
    "UDID": "10378300660576423|16148",
    "type": "action",
    "ts": 1395151332224
}{
    "action": "dropdown_close",  // drop down closes 
    "UDID": "10378300660576423|16148",
    "type": "action",
    "ts": 1395151334023
}
```