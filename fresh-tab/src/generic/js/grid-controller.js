function GridController(db,newsdomains,cities){
    var _this = this,
        container = null

    this.cardsStatistics = {
        url: [],
        news: [],
        email: [],
        youtube: [],
        weather: [],
        clock: 0
    }

    this.makeid = function(){
        return new Date().getTime() + ":" + Math.floor(Math.random() * 1e10)
    }

    this.redirect = function(url,event){
        if (event.metaKey || event.ctrlKey || event.altKey) $.newtab(url)
        else {
            this.animate($("#content"),"zoomOut").then(function(e){
                e.hide()
                $.redirect(url)
            })
        }
    }

    this.pushCard = function(data) {
        var card

        if (data.widget) {
            if (!data.store) data.store = {}

            switch(data.widget) {
                case "weather": card = new CardWeather(data,cities); break
                case "spotify": card = new CardSpotify(data); break
                case "tutorial": card = new CardTutorial(data); break
                case "clock": card = new CardClock(data); break
                default: card = new CardDefault(data)
            }
        }
        else {
            var newsdomain = false

            if (newsdomains && newsdomains.domains) {
                var i = newsdomains.domains.length

                while (i--) {
                    if (data.url.match(new RegExp("\\:\\/\\/(([^\\/]+\\.)|(0{0}))" + newsdomains.domains[i].replace(/\./g,"\\."),"i"))) {
                        newsdomain = newsdomains.domains[i]
                        break
                    }
                }
            }

            if (newsdomain) card = new CardNews(data,newsdomain)
            else if (data.url.indexOf("gmail.com") + 1 || data.url.indexOf("mail.google.com") + 1 || data.url.indexOf("googlemail.com") + 1) card = new CardEmail(data)
            else if (data.url.indexOf("youtube.com") + 1 && data.url.indexOf("/watch?") + 1) card = new CardYoutube(data)
            else  card = new CardUrl(data)
        }

        return card
    }

    this.animate = function(element,effect){
        return new Promise(function(resolve,reject){
            var e = $(element)

            e.addClass(effect + " animated")
             .one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend',function(){
                 resolve(e)

                 setTimeout(function(){
                     e.removeClass(effect + " animated")
                 },100)
             })
        })
    }

    this.save = function(){
        env.writefile(CARDS_DB, JSON.stringify(this.db));
    }

    this.add = function(newcard){
        newcard.source = "add"
        newcard.id = this.makeid()

        this.db.state.push(newcard)
        this.save()

        var card

        container.grid("add",card = this.pushCard(newcard))

        card.event("add")

        this.animate(card.element.removeClass("invisible"),"bounceIn")

        return card
    }

    this.remove = function(card){
        var index = card.element.data("index")
        this.db.removed[card.element.data("url-hash")] = true;

        card.event("remove")

        container.grid("remove",index)
        this.db.state.splice(index,1)

        this.save()
    }

    this.move = function(from,to){
        var array = [],
            dblen = _this.db.state.length

        container.children(".card").each(function(idx){
            var id = $(this).data("id")

            for (var i=0;i<dblen;i++){
                if (_this.db.state[i].id == id) {
                    array[$(this).data("index")] = _this.db.state[i]
                    break
                }
            }

            if (idx == to) {
                this.card.event("move",function(message){
                    message.position = from
                    message["new-position"] = to
                })
            }
        })

        this.db.state = array
        this.save()
    }

    this.report = function(force){
        var lastenv = env.get("session.lastenv")

        if (force || !lastenv || Date.now() - lastenv > TELEMETRY_REPORT_INTERVAL) {
            telemetry.push("report",{
                height: window.innerHeight,
                width: window.innerWidth,
                agent: navigator.userAgent,
                env: env.name,
                version: env.version,
                cards: this.cardsStatistics,
                "columns-amount": container.grid("columns-amount")
            })

            env.set("session.lastenv",Date.now())
        }
    }

    this.init = function(){
        container = $("#grid")

        var changed = false

        this.db = {
                  state: db.state.map(function(e){
                                        if (!e.id) {
                                            e.id = _this.makeid()
                                            changed = true
                                        }

                                        return e
                                     }),
                  removed: db.removed
        };

        if (changed) this.save()

        container.grid(
            this.db.state.map(function(e){ return _this.pushCard(e) }),
            function(from,to){ _this.move(from,to) }
        )

        var cards = $("#grid > div"),
            array = Array.apply(null,new Array(cards.length)).map(function(e,i){ return i }).shuffle()

        for (var i=0;i<array.length;i++)
            (function(index){
                setTimeout(function(){
                    _this.animate(cards.eq(array[index]).removeClass("invisible"),"bounceIn")
                },i * 50);
            })(i);

        $("#shuffle").click(function(){
            container.grid("shuffle")
        })

        $("body").click(function(e){
            var target = $(e.target)

            if (!target.filter(".city-input").length) $("#citieslist").hide()
        })

        this.report()
    }
}
