function CardNews(data,newsdomain) {
    var _this = this

    this.name = "news"
    this.height = 2

    CardNews.superclass.constructor.apply(this,arguments)

    var newscontainer = this.element.find(".news"),
        request = { q: "news", num_results_per_domain: 3, num_domains: 1, extra_domains: newsdomain }

    $.pget(NEWS_ARTICLES_SOURCE,request,null,"json")
    .then(function(data){
        for (var i=0;i<data.data.news.length;i++) {
            var news = data.data.news[i]

            for (nd in news) {
                for (var i=0;i<news[nd].length;i++) {
                    var item = pm.use("news-item").appendTo(newscontainer)

                    item.find(".td").text(news[nd][i].title);

                    (function(item,url,index,hash){
                        item.attr("url",url).data("domain",this.cleandomain).click(function(e){
                            e.stopPropagation()

                            var clickmap = $(this).clickmap(e)

                            _this.event("news-item-click",function(message){
                                message["news-item-index"] = index
                                message["news-item-url-hash"] = hash
                                message.clickmap = clickmap
                            })

                            gc.redirect(url,e)
                        })
                    })(item,news[nd][i].url,i,news[nd][i].hash_url)
                }
            }
        }
    })

    setTimeout(function(){ newscontainer.addClass("animated") },Math.random() * 3000)
}

CardNews.extends(CardUrlAbstract)
