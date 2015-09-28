function CardEmail(data) {
    var _this = this

    this.name = "email"
    this.height = 2

    CardEmail.superclass.constructor.apply(this,arguments)

    if (gapi.token) {
        this.view("loader")

        var firstAttempt = true,
            read = function(){
                gapi.gmailUnread()
                .then(function(amount){
                    if (amount) {
                        _this.element.find(".unread").text("You have " + amount + " new emails")
                        _this.view("unread")
                    }
                    else _this.view("no-unread")
                })
                .catch(function(ex){
                    gapi.refresh().then(function(){
                        if (firstAttempt) {
                            firstAttempt = false
                            read()
                        }
                    })
                })
            }

        read()
    }
    else {
        _this.element.find(".auth").click(function(e){ gapi.oauth2(); e.stopPropagation() })
        _this.view("auth")
    }
}

CardEmail.extends(CardUrlAbstract)
