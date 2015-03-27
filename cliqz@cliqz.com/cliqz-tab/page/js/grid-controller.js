function GridController(db,newsdomains,cities){
    var _this = this,
        prototypes = {},
        container = null
    
    var use = function(prototype){
        var block = prototypes[prototype].clone().removeClass("prototype")
        
        block.find(".prototype").remove()
        
        return block
    }
    
    this.makeid = function(){
        return new Date().getTime() + ":" + Math.floor(Math.random() * 1e10)
    }
    
    this.makeCard = function(height,name,data){
        var template
        
        try {
            template = use(name)
        }
        catch(ex) {
            template = use("card-default")
        }
        
        var card = {
            height: height,
            element: $("<div class='card invisible'>").data("id",data.id).append(
                use("close-button").click(function(e){
                    _this.remove($(this).parent())
                }),
                template
            ),
            view: function(name){
                card.element.find(".view").hide().filter("." + name).show()
            }
        }
        
        return card
    }
    
    this.redirect = function(url){
        /*
        _this.animate($("#content"),"zoomOut").then(function(e){
            e.hide()
        })
        */
        $.redirect(url)
    }
    
    this.pushCard = function(data) {    
        var card
        
        if (data.widget) {
            if (!data.store) data.store = {}
            
            switch(data.widget) {
                case "weather":
                    card = this.makeCard(1,"card-weather",data)
                    
                    var selected
                    
                    var render = function(attempt) {
                        selected = -1
                        
                        if (data.store.city) {
                            card.view("loader")
                            
                            var city = cities.filter(function(e){ return data.store.city == e.city })[0]

                            $.pget(WEATHER_SOURCE,{ q: "wetter " + data.store.city },null,"json")
                            .then(function(data){
                                try {
                                    var result = data.results[0].data
                                    
                                    if (!result) throw Error("No result")

                                    card.element.find(".image").css("background-image","url(" + result.todayIcon + ")")
                                    card.element.find(".temperature").text(result.todayTemp + " " + result.todayDescription)
                                    
                                    var title
                                    
                                    if (city) title = city.city + ", " + city.country
                                    else title = result.returned_location
                                    
                                    card.element.find(".title").text(title)
                                    
                                    card.view("main")
                                }
                                catch(ex) {
                                    if (!attempt || attempt && attempt < 3) {
                                        setTimeout(function(){
                                            render(attempt?attempt + 1:1)
                                        },3000)
                                    }
                                    else {
                                        card.element.find(".error")
                                                    .text("Das Wetter für " + city.city + ", " + city.country
                                                                            + " ist derzeit nicht verfügbar")
                                        card.view("error")
                                    }
                                }
                            })
                        }
                        else card.view("settings")
                    }
                    
                    var chooseCity = function(element){
                        $("#citieslist").hide()
                        data.store.city = $(element).data("city")
                        _this.save()
                        render()
                    }
                    
                    card.element.find(".city-input").keyup(function(e){
                        if ([13,38,40].indexOf(e.keyCode) + 1) return false
                        
                        var value = this.value.toLowerCase(),
                            found = cities.filter(function(e){ return e.citylower.indexOf(value) == 0 })
                                          .sort(function(a,b){ return a.city < b.city })
                                          .slice(0,3)
                                          .map(function(e){
                                              return $("<div>").text(e.city).data("city",e.city).click(function(){
                                                  chooseCity(this)
                                              })
                                          }),
                            $this = $(this),
                            offset = $this.offset()

                        if (found.length) {
                            $("#citieslist").show().html("").append(found).css({
                                width: $this.outerWidth() + "px",
                                top: offset.top + $this.outerHeight() + "px",
                                left: offset.left + "px"
                            })
                        }
                        else $("#citieslist").hide()
                    }).keydown(function(e){
                        switch(e.keyCode) {
                            case 38: 
                                if (selected > -1) {
                                    $("#citieslist > div").eq(selected--).removeAttr("selected")
                                    $("#citieslist > div").eq(selected).attr("selected","selected")
                                }
                                
                                return false;
                            case 40: 
                                if (selected < 2) {
                                    $("#citieslist > div").eq(selected++).removeAttr("selected")
                                    $("#citieslist > div").eq(selected).attr("selected","selected")
                                }
                                
                                return false;
                            case 13:
                                if (selected > -1) {
                                    chooseCity($("#citieslist > div").eq(selected))
                                }
                                
                                return false;
                            default: return true;
                        }
                    })
                    
                    render()
                    
                    break;
                case "stickynote": 
                    card = this.makeCard(1,"card-stickynote",data)
                    
                    break;
                case "message": 
                    card = this.makeCard(1,"card-message",data)
                    
                    break;
                case "countdown": 
                    card = this.makeCard(1,"card-countdown",data)
                    
                    var days = Math.floor((new Date(2015,3,18).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
                    
                    card.element.children(".card-countdown").text("Launch in " + days + " days!")
                    
                    break;
                case "tutorial": 
                    card = this.makeCard(2,"card-tutorial",data)
                    
                    data.store.tip = data.store.tip || 1
                    
                    var button = card.element.find(".next-tip")
                    
                    var render = function() {
                        card.view("tip-" + data.store.tip)
                        
                        if (data.store.tip == button.siblings().length) button.hide()
                    }
                    
                    button.click(function(){
                        data.store.tip ++
                        _this.save()
                        render()
                    })
                    
                    render()
                    
                    break;
                case "clock": 
                    card = this.makeCard(1,"card-clock",data)
                    
                    var gethand = function(value,fullcircle){
                        return value * 2 * Math.PI / fullcircle - Math.PI / 2
                    }
                    
                    for (i=0;i<12;i++) {
                        var item = use("notch").appendTo(card.element.find(".clock"))
                        
                        item.css("transform","rotateZ(" + gethand(i,12) + "rad)")
                    }
                    
                    var tick = function(){
                        var d = new Date(),
                            days = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"],
                            months = ["Januar", "Februar", "März", "April", "Mai", "Juni",
                                      "Juli", "August", "September", "Oktober", "November", "Dezember"],
                            lpad = function(n){
                                var ns = n.toString()
                                
                                return ns.length == 1?"0" + ns.toString():ns
                            },
                            hour = gethand(d.getHours() + d.getMinutes() / 60,12),
                            minute = gethand(d.getMinutes() + d.getSeconds() / 60,60),
                            second = gethand(d.getSeconds(),60)
                        
                        card.element.find(".hand-hour").css("transform","rotateZ(" + hour + "rad)")
                        card.element.find(".hand-minute").css("transform","rotateZ(" + minute + "rad)")
                        card.element.find(".hand-second").css("transform","rotateZ(" + second + "rad)")
                        
                        card.element.find(".title").text(lpad(d.getHours()) + ":" + lpad(d.getMinutes()))
                        card.element.find(".subtitle").text(days[d.getDay()] + ", " + d.getDate() + " " + months[d.getMonth()])
                    }
                    
                    tick()
                    setInterval(tick,1000)
                    
                    break;
                default:  card = this.makeCard(1,"card-default",data)
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

                $.pget(NEWS_ARTICLES_SOURCE,{ q: "news",num_results_per_domain: 3,num_domains: 1,extra_domains: newsdomain },null,"json")
                .then(function(data){
                    for (var i=0;i<data.data.news.length;i++) {
                        var news = data.data.news[i]

                        for (nd in news) {
                            for (var i=0;i<news[nd].length;i++) {
                                var item = use("news-item").appendTo(newscontainer)

                                item.find(".td").text(news[nd][i].title);
                                
                                (function(item,url){
                                    item.attr("url",url).click(function(e){
                                        e.stopPropagation()
                                        _this.redirect(url)
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
        browser.writefile(CARDS_DB,JSON.stringify(this.db))
    }
    
    this.add = function(newcard){
        newcard.source = "add"
        newcard.id = this.makeid()
        
        this.db.push(newcard)
        this.save()
        
        var card
        
        container.grid("add",card = this.pushCard(newcard))
        
        this.animate(card.element.removeClass("invisible"),"bounceIn")
        
        return card
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
    }
    
    this.init()
}