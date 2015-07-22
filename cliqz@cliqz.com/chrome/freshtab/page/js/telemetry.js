function Telemetry() {
    var _this = this,
        messages = [],
        chunk,
        sending = false

    var newsession = function(){
        var random = function(length,mask){
            return Array.apply(null,new Array(length))
                        .map(function(){ return mask[Math.floor(Math.random() * mask.length)] }).join("")
        }

        return random(18,"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
               + random(6,'0123456789') + '|'
               + Math.floor(Date.now() / 86400000) + '|NONE'
    }

    this.push = function(type,message){
        if (!type) return

        var _message = message || {},
            enhance = function(object){
                object.session = env.get("session")
                object.ts = Date.now()
                object.type = "freshtab:" + type

                return object
            }

        messages.push(enhance(_message))
    }

    this.send = function(type,message){
        if (type) this.push(type,message)

        if (env.get("disable-telemetry") == "true") return

        var chunk = messages.length

        if (!sending && chunk > 0) {
            sending = true

            $.pajax({
                type: "POST",
                url: TELEMETRY_SERVER,
                processData: false,
                contentType: "application/json",
                data: JSON.stringify(messages),
                dataType: "json"
            })
            .then(function(data){
                if (data.new_session) env.set("session",data.new_session)

                messages = messages.slice(chunk)
                sending = false
            })
            .catch(function(){
                messages = messages.slice(-1000)
                sending = false
            })
        }
    }

    this.startup = function() {
        if (!env.get("session")) {
            env.set("session",newsession())
            this.send("startup",{ startup: true })
        }
    }

    this.init = function(){
        this.startup()

        setInterval(function(){ _this.send() },TELEMETRY_INTERVAL)
    }

    this.event = {
        click: function(targetname,clickmap) {
            _this.push("event",{
                target: targetname,
                clickmap: clickmap,
                event: "click"
            })
        },
        focus: function(inputname) {
            _this.push("event",{
                target: inputname,
                event: "focus"
            })
        },
        blur: function(inputname) {
            _this.push("event",{
                target: inputname,
                event: "blur"
            })
        }
    }

    this.init()
}

Telemetry.hashURL = function(url){
    var hash = CryptoJS.SHA1(url).toString()

    return hash.substr(0,hash.length - 5)
}
