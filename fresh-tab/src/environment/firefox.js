function Environment() {
    Components.utils.import("resource://gre/modules/XPCOMUtils.jsm")
    Components.utils.import("resource://gre/modules/NewTabUtils.jsm")
    Components.utils.import("resource://gre/modules/osfile.jsm")
    Components.utils.import("resource://gre/modules/AddonManager.jsm")

    XPCOMUtils.defineLazyModuleGetter(window,'CliqzUtils','chrome://cliqzmodules/content/CliqzUtils.jsm')

    var FOLDER = OS.Path.join(OS.Constants.Path.profileDir,"cliqz"),
        _this = this,
        PREF_STRING = 32,
        PREF_INT =    64,
        PREF_BOOL =   128,
        prefs = Components.classes['@mozilla.org/preferences-service;1']
                      .getService(Components.interfaces.nsIPrefService)
                      .getBranch('extensions.cliqztab.');

    this.history = function(callback){
        NewTabUtils.links.populateCache(function(){
            callback(NewTabUtils.links.getLinks().map(function(e){
                return {
                    url: e.url,
                    title: e.title,
                    source: "history"
                }
            }))
        })
    }

    this.geolocation = function(callback) {
        var xpcomGeolocation = Components.classes["@mozilla.org/geolocation;1"].getService(Components.interfaces.nsISupports);
        xpcomGeolocation.getCurrentPosition(callback);
    }

    this.cliqzdir = function(){
        return OS.File.makeDir(FOLDER)
    }

    this.fileexists = function(filename){
        console.log("checking existense " + filename)

        return OS.File.exists(OS.Path.join(FOLDER,filename))
    }

    this.readfile = function(filename){
        var decoder = new TextDecoder()

        console.log("reading " + filename)

        return OS.File.read(OS.Path.join(FOLDER,filename)).then(function(array){ return decoder.decode(array) })
    }

    this.writefile = function(filename,content){
        var encoder = new TextEncoder(),
            array = encoder.encode(content)

        console.log("writing " + filename)

        return OS.File.writeAtomic(OS.Path.join(FOLDER,filename),array,{ tmpPath: OS.Path.join(FOLDER,Math.random() + ".tmp") })
    }

    this.set = function(pref, val){
        switch (typeof val) {
            case 'boolean': prefs.setBoolPref(pref, val); break;
            case 'number': prefs.setIntPref(pref, val); break;
            case 'string': prefs.setCharPref(pref, val); break;
        }
    }

    this.get = function(pref, notFound){
        try {
            switch(prefs.getPrefType(pref)) {
                case PREF_BOOL: return prefs.getBoolPref(pref);
                case PREF_STRING: return prefs.getCharPref(pref);
                case PREF_INT: return prefs.getIntPref(pref);
                default: return notFound;
            }
        } catch(e) {
            return notFound;
        }
    }

    this.oauthInit = function(url){
        Components.utils.import("resource://gre/modules/Services.jsm");

        var observerService = Components.classes["@mozilla.org/observer-service;1"]
                                .getService(Components.interfaces.nsIObserverService);

        var httpopenObserver = {
          observe: function(subject) {
            var aChannel = subject.QueryInterface(Components.interfaces.nsIHttpChannel);
                loadingUrl = aChannel.URI.spec;

              //if the browser wants to load the dummy url we block it, store the OAUTH tokens and refresh freshtab
              if(loadingUrl.indexOf(url) == 0){
                var query = loadingUrl.replace("#","?").split("?"),
                  params = query[1].split("&").map(function(e){
                      var nv = e.split("=")

                      return { name: nv[0], value: nv[1] }
                  }),
                  token = params.filter(function(e){
                      return e.name == "access_token"
                  })

              if (token && token[0]) {
                  env.set("oauth-google-token",token[0].value)
              }

              // cancel the request
              subject.cancel(Components.results.NS_BINDING_ABORTED)

              //open about:cliqz
              CliqzUtils.setTimeout(function(){
                CliqzUtils.getWindow().gBrowser.selectedBrowser.contentDocument.location = 'about:cliqz'
              }, 0);

              //remove the observer
              observerService.removeObserver(httpopenObserver, 'http-on-modify-request');
            }
          }
        }

        observerService.addObserver(httpopenObserver, "http-on-modify-request", false);
    }

    this.name = "firefox"

    AddonManager.getAddonByID("cliqz@cliqz.com", function (addon) { _this.version = addon.version })
}
