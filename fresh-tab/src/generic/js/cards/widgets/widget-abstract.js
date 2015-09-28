function CardWidgetAbstract(data) {
    this.name = this.name || data.widget

    CardWidgetAbstract.superclass.constructor.apply(this,arguments)

    this.element.click(function(e){
        var clickmap = $(this).clickmap(e)

        _this.event("click",function(message){ message.clickmap = clickmap })
    })
}

CardWidgetAbstract.extends(Card)
