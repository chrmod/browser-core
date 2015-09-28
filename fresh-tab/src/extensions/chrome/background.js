var env = new Environment()

function broadcast(message) {
    chrome.tabs.query({},function(tabs) {
        for (var i=0;i<tabs.length;++i) chrome.tabs.sendMessage(tabs[i].id,message)
    })
}

chrome.browserAction.onClicked.addListener(function(){
    chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    },function(t){
        alert(t[0].title + " " + t[0].url)
    })
})

chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
        console.log(details)

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

            if (details.type != "xmlhttprequest") broadcast({ action: "refresh" })
        }

        return { redirectUrl: chrome.extension.getURL("page/freshtab.html") }
    },
    {urls: ["*://oauth.freshtab.cliqz.com/*"]},
    ["blocking"]
);
