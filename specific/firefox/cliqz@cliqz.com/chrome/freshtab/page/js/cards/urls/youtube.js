function CardYoutube(data) {
    var _this = this

    this.name = "youtube"
    this.height = 2

    CardYoutube.superclass.constructor.apply(this,arguments)

    $.pget("http://www.youtube.com/oembed",{ url: data.url, format: "json" })
    .then(function(data){
        _this.element.find(".video").css("background-image","url(" + data.thumbnail_url + ")")
    })
    .catch(function(){
        // url is not returning anything
    })

    this.element.find(".video").click(function(e){
        e.stopPropagation()

        var query = data.url.split("?"),
            params = query[1].split("&").map(function(e){
                var nv = e.split("=")

                return { name: nv[0], value: nv[1] }
            }),
            id = params.filter(function(e){
                return e.name == "v"
            }),
            embedurl = "http://www.youtube.com/embed/" + id[0].value + "?autoplay=1"

        $("#content > *").addClass("none")
        $("#youtube-embed").removeClass("none").find("iframe").attr("src",embedurl)
    })
}

CardYoutube.extends(CardUrlAbstract)
