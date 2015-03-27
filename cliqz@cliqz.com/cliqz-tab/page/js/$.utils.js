(function($){
    $.redirect = function(url){
        window.top.location.href = url
    }

    $.pget = function(){
        var tmpargs = arguments
        
        return new Promise(function(resolve,reject){
            $.get.apply($,tmpargs).done(resolve)
        })
    }
})(jQuery)