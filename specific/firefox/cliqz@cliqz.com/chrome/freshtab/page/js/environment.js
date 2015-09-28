function Environment() {
    Components.utils.import("resource://gre/modules/XPCOMUtils.jsm")
    Components.utils.import("resource://gre/modules/NewTabUtils.jsm")
    Components.utils.import("resource://gre/modules/osfile.jsm")
    Components.utils.import("resource://gre/modules/AddonManager.jsm")

    XPCOMUtils.defineLazyModuleGetter(window,'CliqzUtils','chrome://cliqzmodules/content/CliqzUtils.jsm')

    var FOLDER = OS.Path.join(OS.Constants.Path.profileDir,"cliqz"), _this = this

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

    this.set = function(name,value){
        CliqzUtils.setPref(name,value)
    }

    this.get = function(name){
        return CliqzUtils.getPref(name)
    }

    this.name = "firefox"

    AddonManager.getAddonByID("cliqz@cliqz.com", function (addon) { _this.version = addon.version })
}
