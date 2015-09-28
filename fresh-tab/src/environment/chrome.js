function Environment() {
    this.history = function(callback){
        chrome.topSites.get(function(data){
            callback(data.map(function(e){
                return {
                    url: e.url,
                    title: e.title,
                    source: "history"
                }
            }))
        })
    }

    this.cliqzdir = function(){
        // always "created" - no folder in fact
        return new Promise(function(resolve,reject){
            resolve()
        })
    }

    this.fileexists = function(filename){
        console.log("checking existense " + filename)

        return new Promise(function(resolve,reject){
            chrome.storage.local.get(filename,function(data){
                if (data[filename]) resolve(true)
                else resolve(false)
            })
        })
    }

    this.readfile = function(filename){
        console.log("reading " + filename)

        return new Promise(function(resolve,reject){
            chrome.storage.local.get(filename,function(data){
                if (data[filename]) resolve(data[filename])
                else reject(new Error("no file found"))
            })
        })
    }

    this.writefile = function(filename,content){
        console.log("writing " + filename)

        var obj = {}

        obj[filename] = content

        return new Promise(function(resolve,reject){
            chrome.storage.local.set(obj,function(){
                resolve()
            })
        })
    }

    this.set = function(name,value){
        localStorage.setItem("extensions.cliqz." + name,value)
    }

    this.get = function(name){
        return localStorage.getItem("extensions.cliqz." + name)
    }

    this.name = "chrome"
    this.version = chrome.app.getDetails().version
}

chrome.runtime.onMessage.addListener(function(request,sender,response) {
    if (sender.tab) return

    window.location.reload()
})
