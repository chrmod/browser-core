var db = null,
    news_domains_cache = null,
    citieslist = null,
    firstrun = false,
    TAB_ID = Math.floor(Math.random() * 1e16).toString() + Date.now().toString(),
    env = new Environment(),
    telemetry = new Telemetry(),
    gapi = new GoogleAPI(),
    gc, pm

// create cliqz folder if not exists
env.cliqzdir()
.then(function(){
    return Promise.all([
        // cards database
        env.fileexists(CARDS_DB)
        .then(function(exists){
            // if database exists use it
            if (exists) {
                return env.readfile(CARDS_DB)
                       .then(function(content){
                           db = JSON.parse(content)
                           return true
                       })
            }
            // if database does not exists, create one
            else {
                return new Promise(function(resolve,reject){
                    env.history(function(history){
                        db = history.slice(0,10)
                        env.writefile(CARDS_DB,JSON.stringify(db))

                        firstrun = true

                        resolve()
                    })
                })

            }
        }),
        // news domains database / cache
        env.fileexists(NEWS_DOMAINS_DB)
        .then(function(exists){
            var getdomains = function(){
                return $.pget(NEWS_DOMAINS_SOURCE)
                       .then(function(data){
                           news_domains_cache = data
                           env.writefile(NEWS_DOMAINS_DB,JSON.stringify(data))
                       }).catch(function(err) {
                          console.log('news loading error ', err.message); // some coding error in handling happened
                       });
            }

            // if news domains are cached then read and send the request
            if (exists) {
                getdomains()

                return env.readfile(NEWS_DOMAINS_DB)
                       .then(function(data){
                           news_domains_cache = JSON.parse(data)

                           return true
                       })
            }
            // if news domains are not cached then get it
            else return getdomains()
        }),
        $.pget("cities.json",null,null,"text").then(function(data){
            citieslist = JSON.parse(data).cities.map(function(e){ e.citylower = e.city.toLowerCase(); return e })
        })
    ])
})
.then(function(){
    $(function(){
        // send tab open event
        telemetry.push("tab-event",{
            "tab-id": TAB_ID,
            event: "open"
        })

        // send tab close event when leaving the page
        $(window).bind("beforeunload",function(){
            telemetry.send("tab-event",{
                "tab-id": TAB_ID,
                event: "close"
            })
        })

        // set telemetry events for static elements
        $("[tm-click]").click(function(e){ telemetry.event.click($(this).attr("tm-click"),$(this).clickmap(e)) })
        $("[tm-focus]").focus(function(e){ telemetry.event.focus($(this).attr("tm-focus")) })
        $("[tm-blur]").blur(function(e){ telemetry.event.blur($(this).attr("tm-blur")) })

        // depending on environment show / hide search field
        if (env.name == "firefox") {
            if (DEBUG_MODE_ON) $("#urlbar").focus().cliqz($("#box").addClass("debug-mode"))
            else {
                var urlbar = CliqzUtils.getWindow().document.getElementById("urlbar")

                $("#urlbar").attr("placeholder",urlbar.placeholder).click(function(){ urlbar.focus() })
            }
        }
        else {
            $(document.body).click(function(e){
                var box = $(e.target).closest("#box")

                if (!box.length) $("#box").addClass("blurred")
            })

            $(".search-box input").focus(function(){
                                      if (this.value) $("#box").removeClass("blurred")
                                  })
                                  .keyup(function(){
                                      if (!this.value) $("#box").addClass("blurred")
                                      else $("#box").removeClass("blurred")
                                  })
        }

        // set up background
        $("#background").background()

        // initalize controllers
        pm = new PrototypeManager()
        gc = new GridController(db,news_domains_cache,citieslist)

        gc.init()

        var popup = new AddCardPopup(gc)

        // initialize additional cards
        if (firstrun) {
            gc.add({ widget: "spotify" })
            gc.add({ widget: "tutorial" })
        }
    })
})
