function CardWeather(data,cities) {
    var _this = this, selected

    CardWeather.superclass.constructor.apply(this,arguments)

    this.render = function(attempt) {
        selected = -1

        if (data.store.city) {
            this.view("loader")

            var country = data.store.country?data.store.country.toUpperCase():null,
                city = cities.filter(function(e){ return data.store.city == e.city && (!country || country == e.country) })[0]

            $.pget(WEATHER_SOURCE,{ path: "/map", q: "wetter " + data.store.city + (data.store.country?" " + data.store.country:"") },null,"json")
            .then(function(data){
                try {
                    var result = data.results[0].data

                    if (!result) throw Error("No result")

                    _this.element.find(".image").css("background-image","url(" + result.todayIcon + ")")
                    _this.element.find(".temperature").text(result.todayTemp + " " + result.todayDescription)

                    var title

                    if (city) title = city.city + ", " + city.country
                    else title = result.returned_location

                    _this.element.find(".title").text(title)

                    _this.view("main")
                }
                catch(ex) {
                    if (!attempt || attempt && attempt < 3) {
                        setTimeout(function(){
                            _this.render(attempt?attempt + 1:1)
                        },3000)
                    }
                    else {
                        _this.element.find(".error")
                                     .text("Das Wetter für " + city.city + ", " + city.country
                                                             + " ist derzeit nicht verfügbar")
                        _this.view("error")
                    }
                }
            })
        }
        else this.view("settings")
    }

    this.chooseCity = function(element){
        $("#citieslist").hide()
        data.store.city = $(element).data("city")
        data.store.country = $(element).data("country")
        gc.save()
        _this.render()
    }

    this.element.find(".city-input")
    .focus(function(){ _this.event("city-filter-focus") })
    .blur(function(){ _this.event("city-filter-blur") })
    .keyup(function(e){
        if ([13,38,40].indexOf(e.keyCode) + 1) return false

        var televalue = this.value

        _this.event("city-filter-keyup",function(message){
            message["filter-value"] = televalue
        })

        var value = this.value.toLowerCase(),
            found = cities.filter(function(e){ return e.citylower.indexOf(value) == 0 })
                          .sort(function(a,b){ return a.city > b.city })
                          .slice(0,3)
                          .map(function(e,i){
                              var img = "url(" + FLAGS_FOLDER + e.country.toLowerCase() + ".svg)"

                              return $("<div>").css("background-image",img)
                                               .text(e.city)
                                               .data({ city: e.city, country: e.country.toLowerCase(), index: i })
                                               .click(function(){
                                                   var $this = $(this), clickmap = $this.clickmap(e)

                                                   _this.event("city-list-click",function(message){
                                                       message.clickmap = clickmap
                                                       message["city-index"] = $this.data("index")
                                                       message["city-name"] = $this.data("city")
                                                       message["country-name"] = $this.data("country")
                                                   })

                                                   _this.chooseCity(this)
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
    })
    .keydown(function(e){
        switch(e.keyCode) {
            case 38:
                if (selected > -1) {
                    $("#citieslist > div").eq(selected--).removeAttr("selected")
                    if (selected != -1) $("#citieslist > div").eq(selected).attr("selected","selected")
                }

                _this.event("city-list-up")

                return false;
            case 40:
                if (selected < 2) {
                    $("#citieslist > div").eq(selected++).removeAttr("selected")
                    $("#citieslist > div").eq(selected).attr("selected","selected")
                }

                _this.event("city-list-down")

                return false;
            case 13:
                if (selected > -1) {
                    var $this = $("#citieslist > div").eq(selected)

                    _this.event("city-list-enter",function(message){
                        message["city-index"] = selected
                        message["city-name"] = $this.data("city")
                        message["country-name"] = $this.data("country")
                    })

                    _this.chooseCity($this)
                }

                return false;
            default: return true;
        }
    })

    this.render()

    gc.cardsStatistics.weather.push({
        city: data.store.city,
        country: data.store.country
    })
}

CardWeather.extends(CardWidgetAbstract)
