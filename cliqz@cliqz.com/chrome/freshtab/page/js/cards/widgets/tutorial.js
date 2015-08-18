function CardTutorial(data) {
    var _this = this

    this.height = 2

    CardTutorial.superclass.constructor.apply(this,arguments)

    data.store.tip = data.store.tip || 1

    var button = this.element.find(".next-tip")

    this.render = function() {
        this.view("tip-" + data.store.tip)

        if (data.store.tip == button.siblings().length) button.hide()
    }

    button.click(function(){
        data.store.tip ++
        gc.save()
        _this.render()
    })

    this.render()
}

CardTutorial.extends(CardWidgetAbstract)
