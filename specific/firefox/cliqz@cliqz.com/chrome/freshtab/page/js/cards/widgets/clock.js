function CardClock(data) {
    var _this = this

    CardClock.superclass.constructor.apply(this,arguments)

    var days = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"],
        months = ["Januar", "Februar", "März", "April", "Mai", "Juni",
                  "Juli", "August", "September", "Oktober", "November", "Dezember"],
        gethand = function(value,fullcircle){
            return value * 2 * Math.PI / fullcircle - Math.PI / 2
        },
        lpad = function(n){
            var ns = n.toString()

            return ns.length == 1?"0" + ns.toString():ns
        }

    for (i=0;i<12;i++) {
        var item = pm.use("notch").appendTo(this.element.find(".clock"))

        item.css("transform","rotateZ(" + gethand(i,12) + "rad)")
    }

    this.tick = function(){
        var d = new Date(),
            hour = gethand(d.getHours() + d.getMinutes() / 60,12),
            minute = gethand(d.getMinutes() + d.getSeconds() / 60,60),
            second = gethand(d.getSeconds(),60)

        this.element.find(".hand-hour").css("transform","rotateZ(" + hour + "rad)")
        this.element.find(".hand-minute").css("transform","rotateZ(" + minute + "rad)")
        this.element.find(".hand-second").css("transform","rotateZ(" + second + "rad)")

        this.element.find(".title").text(lpad(d.getHours()) + ":" + lpad(d.getMinutes()))
        this.element.find(".subtitle").text(days[d.getDay()] + ", " + d.getDate() + " " + months[d.getMonth()])
    }

    this.tick()

    setInterval(function(){ _this.tick() },1000)

    gc.cardsStatistics.clock ++
}

CardClock.extends(CardWidgetAbstract)
