function AddCardPopup(gc) {
    var _this = this

    this.popup = $("#add-popup")
    this.title = $("#add-popup-title")
    this.url = $("#add-popup-url")

    this.show = function(){ this.popup.show() }

    this.hide = function(){
        this.popup.hide()
        this.title.val("")
        this.url.val("")
        this.showlogo()
    }

    this.showlogo = function(){
        var urlinfo = CliqzUtils.getDetailsFromUrl(_this.completeurl(this.url.val())),
            logoinfo = CliqzUtils.getLogoDetails(urlinfo),
            logo = $("#add-popup-logo > div")
        
        if (logoinfo.backgroundColor) logo.text(logoinfo.text).attr("style",logoinfo.style).css("border","0")
        else logo.text("").removeAttr("style")
    }
    
    this.completeurl = function(url){
        return (url.match(/^\:\/\//))?url:"http://" + url
    }
    
    this.init = function(){
        $("#add").click(function(){ _this.show(); _this.url.focus() })
        
        $("#add-popup-weather").click(function(){
            var card = gc.add({ widget: "weather" })
            
            card.element.find(".city-input").focus()
            
            _this.hide()
        })
        
        $("#add-popup-message").click(function(){
            gc.add({ widget: "message" })
            
            _this.hide()
        })
        
        $("#add-popup-clock").click(function(){
            gc.add({ widget: "clock" })
            
            _this.hide()
        })
        
        $("#add-popup-cancel").click(function(){ _this.hide() })

        $("#add-popup-ok").click(function(){
            gc.add({
                title: _this.title.val(),
                url: _this.completeurl(_this.url.val())
            })
            
            _this.hide()
        })

        _this.url.change(function(){
            _this.showlogo()
            
            if (!_this.title.val()) {
                $.get(_this.completeurl(this.value),function(data){
                    _this.title.val($(data).filter("title").text())
                },"text")
            }
        })
        
        _this.url.keyup(function(){
            _this.showlogo()
        })
    }

    this.init()
}