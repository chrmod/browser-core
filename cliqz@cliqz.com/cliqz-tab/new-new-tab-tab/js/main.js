var WEATHER_SOURCE = "http://rich-header-server.clyqz.com/map",
    WEATHER_CITIES = "",
    NEWS_SOURCE = "http://news-swimlane-2066568083.us-east-1.elb.amazonaws.com",
    NEWS_DOMAINS_SOURCE = NEWS_SOURCE + "/news-domains-list",
    NEWS_ARTICLES_SOURCE = NEWS_SOURCE + "/articles",
    CARDS_DB = "cards.json",
    NEWS_DOMAINS_DB = "news-domains.json",
    db = null,
    news_domains_cache = null,
    citieslist = null

// create cliqz folder if not exists
browser.cliqzdir()
.then(function(){
    return Promise.all([
        // cards database
        browser.fileexists(CARDS_DB)
        .then(function(exists){
            // if database exists use it
            if (exists) {
                return browser.readfile(CARDS_DB)
                       .then(function(content){
                           db = JSON.parse(content)
                           return true
                       })
            }
            // if database does not exists, create one
            else {
                return new Promise(function(resolve,reject){
                    browser.history(function(history){
                        db = history.slice(0,10)
                        browser.writefile(CARDS_DB,JSON.stringify(db))
                        
                        resolve()
                    })
                })
                
            }
        }),
        // news domains database / cache
        browser.fileexists(NEWS_DOMAINS_DB)
        .then(function(exists){
            var getdomains = function(){
                return $.pget(NEWS_DOMAINS_SOURCE)
                       .then(function(data){
                           news_domains_cache = data
                           browser.writefile(NEWS_DOMAINS_DB,JSON.stringify(data))
                       })
            }
            
            // if news domains are cached then read and send the request
            if (exists) {
                getdomains()
                
                return browser.readfile(NEWS_DOMAINS_DB)
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
.catch(function(error){
    console.error(error)
})
.then(function(){
    $(function(){
        // $("#search").cliqz("#search-dropdown")
        
        var urlbar = CliqzUtils.getWindow().document.getElementById("urlbar")
        
        $("#search").attr("placeholder",urlbar.placeholder).click(function(){ urlbar.focus() })
        
        $("#background").background()

        var gc = new GridController(db,news_domains_cache,citieslist), popup = new AddCardPopup(gc)
    })
})