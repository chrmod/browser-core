Function.prototype.extends = function(Extended) {
    var F = function(){}
    F.prototype = Extended.prototype
    this.prototype = new F()
    this.prototype.constructor = this
    this.superclass = Extended.prototype
};

(function($){
    $.fn.clickmap = function(event){
        var offset = this.offset()

        return {
            x: Math.round((event.pageX - offset.left) / this.outerWidth() * 1e4) / 1e2,
            y: Math.round((event.pageY - offset.top) / this.outerHeight() * 1e4) / 1e2
        }
    }

    $.redirect = function(url){
        window.top.location.href = url
    }

    $.newtab = function(url){
        window.open(url,"_blank")
    }

    $.pget = function(){
        var tmpargs = arguments

        return new Promise(function(resolve,reject){
            $.get.apply($,tmpargs).done(resolve).fail(reject)
        })
    }

    $.ppost = function(){
        var tmpargs = arguments

        return new Promise(function(resolve,reject){
            $.post.apply($,tmpargs).done(resolve).fail(reject)
        })
    }

    $.pajax = function(){
        var tmpargs = arguments

        return new Promise(function(resolve,reject){
            $.ajax.apply($,tmpargs).done(resolve).fail(reject)
        })
    }
})(jQuery)
