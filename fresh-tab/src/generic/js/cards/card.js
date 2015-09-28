function Card(data) {
    var _this = this, template

    this.height = this.height || 1

    this.view = function(name){
        this.element.data("view",name).find(".view").hide().filter("." + name).show()
    }

    this.event = function(event,processor){
        var message = {
            "position": this.element.data("index"),
            "card-type": this.name,
            "domain": this.element.data("domain-hash"),
            "tab-id": TAB_ID,
            "view": this.element.data("view")
        }

        message.event = event

        if (processor) processor(message)

        telemetry.push("card-event",message)
    }

    this.init = function(){
        try {
            template = pm.use("card-" + this.name)
        }
        catch(ex) {
            template = pm.use("card-default")
        }

        this.element = $("<div class='card invisible'>").data("id",data.id).append(
            pm.use("close-button"),
            template
        )

        this.element.children(".close-button").click(function(e){
            gc.remove(_this)
        })

        // binding the HTML element to the card back
        this.element[0].card = this
    }

    this.init()
}
