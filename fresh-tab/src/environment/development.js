function Environment() {
    this.history = function(callback){
        callback([
            { url: "https://cliqz.com", title: "CLIQZ" },
            { url: "http://internet-revolution.com/", title: "Internet Revolution" },
            { url: "https://apple.com", title: "Apple home" },
            { url: "https://google.com", title: "Google" },
            { url: "https://youtube.com", title: "Youtube" },
            { url: "https://maps.google.com", title: "Google Maps" }
        ].map(function(e){
            return {
                url: e.url,
                title: e.title,
                source: "history"
            }
        }))
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
            var data = localStorage.getItem(filename)

            if (data) resolve(true)
            else resolve(false)
        })
    }

    this.readfile = function(filename){
        console.log("reading " + filename)

        return new Promise(function(resolve,reject){
            var data = localStorage.getItem(filename)

            if (data) resolve(data)
            else reject(new Error("no file found"))
        })
    }

    this.writefile = function(filename,content){
        console.log("writing " + filename)

        return new Promise(function(resolve,reject){
            localStorage.setItem(filename,obj)

            resolve()
        })
    }

    this.set = function(name,value){
        localStorage.setItem("extensions.cliqz." + name,value)
    }

    this.get = function(name){
        return localStorage.getItem("extensions.cliqz." + name)
    }

    this.name = "development"
    this.version = "x.x.x"
}
