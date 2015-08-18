function CardUrlAbstract(data) {
    var _this = this

    CardUrlAbstract.superclass.constructor.apply(this,arguments)

    this.init = function() {
        var urlo = new CLIQZ.URL(data.url),
            brand = new CLIQZ.Brand(urlo)

        this.cleandomain = urlo.fulldomain.replace(/^www\./,"")
        this.domainhash = CryptoJS.SHA1(this.cleandomain).toString()

        // content & event
        this.element.click(function(e){
            var clickmap = $(this).clickmap(e)

            _this.event("click",function(message){ message.clickmap = clickmap })

            gc.redirect(data.url,e)
        })

        brand.applylogo(this.element.find(".cliqz-brands-logo")[0])

        this.element.find(".title").text(data.title || data.url)
        this.element.find(".url").text(this.cleandomain)

        this.element.data("domain-hash",this.domainhash)

        gc.cardsStatistics[this.name].push(this.domainhash)
    }

    this.init()
}

CardUrlAbstract.extends(Card)
