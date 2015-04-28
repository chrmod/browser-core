CLIQZ.URL = function(url){
    var parts = url.match(/[^\/]+/g),
        fulldomain = parts[1],
        structure = fulldomain.split(".").reverse(),
        findTLD = function(array){
            var tldfirst = CLIQZ.TLDLIST[array[0]]
            
            if (tldfirst) {
                if (tldfirst == "cc") return CLIQZ.TLDLIST[array[1]]?2:1
                else return 1
            }
            
            return 0
        }
    
    this.full = url
    this.fulldomain = fulldomain
    this.protocol = parts[0] + "//"
    
    this.localhost = ["localhost","127.0.0.1"].indexOf(parts[1]) != -1
    this.ip = !this.localhost && parts[1].match(/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/)?true:false
    
    if (this.localhost) {
        this.host = "localhost"
    }
    else if (this.ip) {
        this.host = parts[1]
    }
    else {
        var hostindex = findTLD(structure)
        
        this.host = structure[hostindex]
        this.tld = structure.slice(0,hostindex).reverse().join(".")
    }

    if (!this.port) {
        switch(this.protocol) {
            case "http://": this.port = 80; break;
            case "https://": this.port = 443; break;
            case "ftp://": this.port = 21; break;
        }
    }
}