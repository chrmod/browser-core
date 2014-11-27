"use strict";

// import firefox modules
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
// this module is default for new tab in FF and provides with top links
Components.utils.import("resource://gre/modules/NewTabUtils.jsm");

var loadnumber = 0;

$(document).ready(function() {
    loadnumber++;
    
    if (loadnumber != 2) return;
    
    $(".background").css("background-image", "url(media/images/wave_bg.jpg)");
    
    // don't remove unbind, for some reason it assigns click event twice without unbinding...
    // toggle() does not work for some reasons...
    $(".options-btn").click(function(event){
        if ($(".options-container").css("display") == "none") $(".options-container").css("display","block");
        else $(".options-container").css("display","none");
        
        event.stopPropagation();
    });
    
    $(document).click(function(){
        $(".options-container").css("display","none");
    });
    
    // get & render history
    NewTabUtils.links.populateCache(() => {
        renderHistory(NewTabUtils.links.getLinks());
    });
    
            //try {
                window.CLIQZ.Core.init();
            //} catch(e) {Cu.reportError(e); }
});

function renderHistory(links){
    for (var i=0;i<Math.min(links.length,10);i++) {
        var link = links[i];
        
        var template = $("#history-row-template").clone();
        
        template.attr("href",link.url).removeAttr("id").removeClass("hidden").appendTo("#history-lis");
        
        template.find(".history-icon").css("background-color","rgb(51,51,51)").text("Gi");
        template.find(".history-title").text(link.title);
        template.find(".history-url").text(link.url);
    }
}