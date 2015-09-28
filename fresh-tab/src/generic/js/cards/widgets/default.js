function CardDefault(data) {
    this.name = "default"

    CardDefault.superclass.constructor.apply(this,arguments)
}

CardDefault.extends(CardWidgetAbstract)
