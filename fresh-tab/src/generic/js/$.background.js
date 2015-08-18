(function($){
    $.fn.background = function(){
        var serverurl = "http://chrome-backgrounds.cliqz.com", element = this;

        $.ajax({
            timeout: 5000,
            type: "GET",
            url: serverurl + "/unsplash/url/",
            dataType: "json",
            crossDomain: true,
            success: function(data) {
                // set image
                if (data["status"] == "ok") element.css("background-image", "url(" + serverurl + data.url + ")");
            },
            error: function() {}
        });
    }
})(jQuery)
