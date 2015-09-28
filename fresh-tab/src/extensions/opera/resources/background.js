var defaulturl = "opera://startpage/#speeddial", freshtab = chrome.extension.getURL("page/freshtab.html");

function redirectSpeedDial(id,url) {
	if (url === defaulturl) {
		chrome.storage.sync.get(
            { url: freshtab },
            function(items) {
                if (items.url !== defaulturl) chrome.tabs.update(id,{ url: items.url?items.url:freshtab })
            }
        )
	}
}

chrome.tabs.onCreated.addListener(function(tab) {
	redirectSpeedDial(tab.id,tab.url)
})

chrome.tabs.onUpdated.addListener(function(id,changes) {
	if (changes.url) redirectSpeedDial(id,changes.url)
})

// from chrome
var env = new Environment()

function broadcast(message) {
    chrome.tabs.query({},function(tabs) {
        for (var i=0;i<tabs.length;++i) chrome.tabs.sendMessage(tabs[i].id,message)
    })
}

chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        var query = details.url.replace("#","?").split("?"),
            params = query[1].split("&").map(function(e){
                var nv = e.split("=")

                return { name: nv[0], value: nv[1] }
            }),
            token = params.filter(function(e){
                return e.name == "access_token"
            })

        if (token && token[0]) {
            env.set("oauth-google-token",token[0].value)

            broadcast({ event: "oauth-callback" })
        }

        return { redirectUrl: chrome.extension.getURL("page/freshtab.html") }
    },
    {urls: ["*://oauth.freshtab.cliqz.com/*"]},
    ["blocking"]
);

chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        var query = details.url.replace("#","?").split("?"),
            params = query[1].split("&").map(function(e){
                var nv = e.split("=")

                return { name: nv[0], value: nv[1] }
            }),
            token = params.filter(function(e){
                return e.name == "access_token"
            })

        if (token && token[0]) {
            env.set("oauth-live-token",token[0].value)

            broadcast({ event: "oauth-callback" })
        }

        return { redirectUrl: chrome.extension.getURL("page/freshtab.html") }
    },
    {urls: ["*://oauth.live.freshtab.cliqz.com/*"]},
    ["blocking"]
);
