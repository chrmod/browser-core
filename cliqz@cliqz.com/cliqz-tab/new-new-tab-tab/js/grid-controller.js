function GridController(db,newsdomains){
    var _this = this,
        prototypes = {},
        container = null
    
    var use = function(prototype){
        return prototypes[prototype].clone().removeClass("prototype")
    }
    
    this.makeid = function(){
        return new Date().getTime() + ":" + Math.floor(Math.random() * 1e10)
    }
    
    this.makeCard = function(height,name,data){
        var card = {
            height: height,
            element: $("<div class='card'>").data("id",data.id).append(
                use("close-button").click(function(e){
                    e.preventDefault()
                    e.stopPropagation()

                    _this.remove($(this).parent())
                }),
                use(name)
            ),
            view: function(name){
                card.element.find(".view").hide().filter("." + name).show()
            }
        }
        
        return card
    }
    
    this.pushCard = function(data) {    
        var card
        
        if (data.widget) {
            if (!data.store) data.store = {}
            
            switch(data.widget) {
                case "weather":
                    card = this.makeCard(1,"card-weather",data)
                    
                    var render = function() {
                        if (data.store.city) {
                            card.view("main")

                            $.pget(WEATHER_SOURCE,{ q: "wetter " + data.store.city })
                            .then(function(data){
                                var result = data.results[0].data
                                
                                card.element.find(".image").css("background-image","url(" + result.todayIcon + ")")
                                card.element.find(".title").text(result.returned_location)
                                card.element.find(".temperature").text(
                                    result.todayTemp + " (" + result.todayMax + " - " + result.todayMin + ")"
                                )
                            })
                        }
                        else card.view("settings")
                    }
                    
                    card.element.find(".card-weather-city-ok").click(function(){
                        data.store.city = $(this).siblings(".card-weather-city-input").val()
                        _this.save()
                        render()
                    })
                    
                    render()
                    
                    break;
                case "message": 
                    card = this.makeCard(1,"card-message",data)
                    
                    break;
                case "datetime": 
                    card = this.makeCard(1,"card-datetime",data)
                    
                    var tick = function(){
                        var d = new Date(),
                            lpad = function(n){
                                var ns = n.toString()
                                
                                return ns.length == 1?"0" + ns.toString():ns
                            },
                            string = lpad(d.getHours()) + ":" + lpad(d.getMinutes()) + ":" + lpad(d.getSeconds());
                        
                        card.element.children(".card-datetime").text(string)
                    }
                    
                    tick()
                    setInterval(tick,1000)
                    
                    break;
                default: console.error("widget " + data.widget + " is not supported")
            }
        }
        else {
            var newsdomain = false

            if (newsdomains && newsdomains.domains) {
                var i = newsdomains.domains.length

                while (i--) {
                    if (data.url.match(new RegExp("\:\/\/[^\/]*" + newsdomains.domains[i],"i"))) {
                        newsdomain = newsdomains.domains[i]
                        break
                    }
                }
            }

            if (newsdomain) {
                card = this.makeCard(2,"card-news",data)

                var newscontainer = card.element.find(".news")

                $.pget(NEWS_ARTICLES_SOURCE,{ q: "news",num_results_per_domain: 3,num_domains: 1,extra_domains: newsdomain })
                .then(function(data){
                    for (var i=0;i<data.data.news.length;i++) {
                        var news = data.data.news[i]

                        for (nd in news) {
                            for (var i=0;i<news[nd].length;i++) {
                                var item = use("news-item").appendTo(newscontainer)

                                item.text(news[nd][i].title);

                                (function(item,url){
                                    item.attr("url",url).click(function(e){
                                        e.stopPropagation()
                                        $.redirect(url)
                                    })
                                })(item,news[nd][i].url)
                            }
                        }
                    }
                })

                setTimeout(function(){
                    newscontainer.addClass("animated")
                },Math.random() * 3000)
            }
            else card = card = this.makeCard(1,"card-url",data)

            // content & event
            card.element.click(function(){ $.redirect(data.url) })

            var urlinfo = CliqzUtils.getDetailsFromUrl(data.url),
                logoinfo = CliqzUtils.getLogoDetails(urlinfo),
                url = urlinfo.host.replace(/^www\./,"")

            card.element.find(".title").text(data.title || url)
            card.element.find(".url").text(url)
            card.element.find(".cliqz-brands-logo").text(logoinfo.text).attr("style",logoinfo.style)
        }
            
        return card
    }
    
    this.save = function(){
        browser.writefile(CARDS_DB,JSON.stringify(this.db))
    }
    
    this.add = function(newcard){
        newcard.source = "add"
        newcard.id = this.makeid()
        
        this.db.push(newcard)
        this.save()
        
        container.grid("add",this.pushCard(newcard))
    }
    
    this.remove = function(card){
        var index = card.data("index")
        
        console.log(index)
        
        container.grid("remove",index)
        this.db.splice(index,1)
        
        this.save()
    }
    
    this.move = function(){
        var array = [],
            dblen = _this.db.length
        
        container.children(".card").each(function(){
            var id = $(this).data("id")
            
            for (var i=0;i<dblen;i++){
                if (_this.db[i].id == id) {
                    array[$(this).data("index")] = _this.db[i]
                    break
                }
            }
        })
        
        this.db = array
        this.save()
    }
    
    this.init = function(){
        container = $("#grid")
        
        $(".prototype").each(function(){
            prototypes[$.trim($(this).attr("class").replace(/prototype/g,""))] = $(this)
        })
        
        var changed = false
        
        this.db = db.map(function(e){
            if (!e.id) {
                e.id = _this.makeid()
                changed = true
            }
            
            return e
        })
        
        if (changed) this.save()
        
        container.grid(
            this.db.map(function(e){ return _this.pushCard(e) }),
            function(){ _this.move() }
        )
        
        $("#shuffle").click(function(){
            container.grid("shuffle")
        })
    }
    
    this.init()
}