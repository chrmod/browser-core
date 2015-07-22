function PrototypeManager(){
    var _this = this

    this.prototypes = []

    this.use = function(prototype){
        var block = this.prototypes[prototype].clone().removeClass("prototype")

        block.find(".prototype").remove()

        return block
    }

    this.init = function() {
        $(".prototype").each(function(){
            _this.prototypes[$.trim($(this).attr("class").replace(/prototype/g,""))] = $(this)
        })
    }

    this.init()
}
