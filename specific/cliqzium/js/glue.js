var urlbar = document.getElementById('urlbar');
CLIQZ.Core = {
    popup: document.getElementById('results'),
    refreshButtons: function(){}
}

CLIQZ.Core.urlbar = urlbar;
CliqzUtils.init(window);
CLIQZ.UI.init(urlbar);

function startAutocomplete(query) {
    urlbar.value = query;
    CLIQZ.UI.main(document.getElementById('results'));
    setTimeout(function() {
        (new CliqzAutocomplete.CliqzResults()).search(query, function(r){
            var currentResults = CLIQZ.UI.results({
                q: r._searchString,
                results: r._results.map(function(r){
                    r.type = r.style;
                    r.url = r.val || '';
                    r.title = r.comment || '';
                    return r;
                }),
                isInstant: false
            });
            chrome.send("resultsReady", [currentResults]);
        });
    }, 0);
}

function stopAutocomplete() {
    // TODO: Stop any ongoing queries.
}

function onHistoryReady(query, matches, finished) {
    var callback = CLIQZEnvironment._pendingHistoryQueries[query];
    if (!query || !(matches instanceof Array))
        throw new Error("No query or matches are not an Array");
    var res = matches.map(function(match) {
        return {
            value:   match.url,
            comment: match.description,
            style:   'favicon',
            image:   '',
            label:   ''
        };
    });
    var callback_obj = {
        query: query,
        results: res,
        ready: true
    };
    try {
        callback(callback_obj);
    }
    finally {
        if (finished)
            delete CLIQZEnvironment._pendingHistoryQueries[query];
    }
}

function moveSelection(/* number */ to) {
    CLIQZ.UI.selectResultByIndex(to);
}

//localization

//set default office location
CLIQZEnvironment.USER_LAT = 48.1517322;
CLIQZEnvironment.USER_LNG = 11.62013;

var loc = document.getElementById("location");

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition);
    } else {
        loc.innerHTML = "Geolocation is not supported by this browser.";
    }
}

function showPosition(position) {
	CLIQZEnvironment.USER_LAT = position.coords.latitude;
    CLIQZEnvironment.USER_LNG = position.coords.longitude;

    loc.innerHTML = "Latitude: " + position.coords.latitude +
    "<br>Longitude: " + position.coords.longitude;
}
