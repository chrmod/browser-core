"use strict";

// import firefox modules
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
// this module is default for new tab in FF and provides with top links
Components.utils.import("resource://gre/modules/NewTabUtils.jsm");

$(function(){
    var serverurl = "http://chrome-backgrounds.cliqz.com",
        googlebarurl = "http://cdn.cliqz.com/extension/newtab/google-bar/";
    
    $("#search").attr("placeholder",CliqzUtils.getWindow().document.getElementById("urlbar").placeholder);
    
    $.ajax({
        timeout: 5000,
        type: "GET",
        url: serverurl + "/unsplash/url/",
        dataType: "json",
        crossDomain: true,
        success: function(data) {
            // set image
            if (data["status"] == "ok") $(".background").css("background-image", "url(" + serverurl + data.url + ")");
            
            // get & render history
            setTimeout(function(){
                NewTabUtils.links.populateCache(() => {
                    renderHistory(NewTabUtils.links.getLinks());
                });
            },200);
        },
        error: function() {}
    });
    
    // fill options
    [
        { name: "Gmail", url: "https://mail.google.com/", img: "gmail.png" },
        { name: "Calendar", url: "https://www.google.com/calendar/", img: "calendar.png" },
        { name: "News", url: "https://news.google.de/", img: "news.png" },
        { name: "Maps", url: "https://maps.google.de/", img: "maps.png" },
        { name: "Youtube", url: "https://www.youtube.de/", img: "youtube.png" }
    ].forEach(function(item){
        $("<a class='option' style='background-image:url(" + googlebarurl + item.img + ")'>").attr("href",item.url)
                                                                                             .attr("target","_top")
                                                                                             .html(item.name)
                                                                                             .appendTo(".options-container")
    })
    
    $(".options-btn").click(function(event){
        if ($(".options-container.active").length) {
            var effect = "flipOutY";
            
            $(".options-container").addClass(effect + " animated")
                                   .removeClass("active")    
                                   .one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
                $(this).removeClass(effect + " animated").hide();
            });            
        }
        else {
            var effect = "flipInY";
            
            $(".options-container").show().addClass(effect + " animated active")
                                   .one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
                $(this).removeClass(effect + " animated");
            });
        }
        
        event.stopPropagation();
    });

    CLIQZ.UI.init();
    CLIQZ.Core.popup = $('#search-dropdown')[0]
    CLIQZ.Core.popup.cliqzBox = $('#search-dropdown')[0];
    CLIQZ.UI.main(CLIQZ.Core.popup.cliqzBox);
    CLIQZ.Core.urlbar = $('.input-box')[0];
    CLIQZ.Core.urlbar.mInputField = $('.input-box')[0];

    $(document).click(function(ev){
        $('#search-dropdown').hide();
    });
    
    var searchinput = $("#search");

    var changeSelected = function(up){
        var active = $(".cliqz-result-item-box[selected='true']"), next;
        
        if (!active.length) next = $(".cliqz-result-item-box:first")
        else next = up?active.prev():active.next();
        
        if (next.length) {
            if (active.length) active[0].setAttribute("selected","false");
            next[0].setAttribute("selected","true");
        }
    };
    
    searchinput.keypress(function(event){
        switch(event.keyCode){
            case 38: changeSelected(true); break;
            case 40: changeSelected(false); break;
            default: return true;
        }

        return false;
    });
    
    searchinput.keyup(function(event){
        switch(event.keyCode){
            case 13: window.top.location.href = Services.search.currentEngine.getSubmission(this.value).uri.spec; break;
            case 37: case 38: case 39: case 40: break;
            case 8: case 46: search(this,true); break;
            default: search(this,false);
        }
    });
    
    searchinput.focus(function(){ search(this,false) });
});

var CliqzResults = {
        classID: Components.ID('{59a99d57-b4ad-fa7e-aead-da9d4f4e77c8}'),
        classDescription : 'Cliqz',
        contractID : '@mozilla.org/autocomplete/search;1?name=cliqz-results',
        QueryInterface: XPCOMUtils.generateQI([ Components.interfaces.nsIAutoCompleteSearch ])
};

XPCOMUtils.defineLazyServiceGetter(CliqzResults, 'historyAutoCompleteProvider',
      '@mozilla.org/autocomplete/search;1?name=cliqz-results', 'nsIAutoCompleteSearch');

function search(input,skipAutoFill){
    CliqzResults.historyAutoCompleteProvider.startSearch(input.value, 'enable-actions', null, {
        onSearchResult: function(search, result) {
           reuseMeFromComponentsXML(result,skipAutoFill);
        }
    });
}


function reuseMeFromComponentsXML(_this,skipAutoFill){
    if ($("#search").val() == "") {
        $('#search-dropdown').hide();
        return;
    }
    
    function unEscapeUrl(url){
      return Components.classes['@mozilla.org/intl/texttosuburi;1'].
                getService(Components.interfaces.nsITextToSubURI).
                unEscapeURIForUI('UTF-8', url)
    }

    if(_this.matchCount > 0){
          var data = [],
            q = _this.searchString.replace(/^\s+/, '').replace(/\s+$/, ''),
            lastRes = CliqzAutocomplete.lastResult;

          for(var i=0; i<_this.matchCount; i++) {
              data.push({
                title: _this.getCommentAt(i),
                url: unEscapeUrl(_this.getValueAt(i)),
                type: _this.getStyleAt(i),
                text: q,
                data: lastRes && lastRes.getDataAt(i),
              });
          }

          CLIQZ.UI.results({
            q: q,
            results: data,
            width: CLIQZ.Core.urlbar.clientWidth
          });
          CLIQZ.UI.suggestions(CliqzAutocomplete.lastSuggestions, q);
          if (!skipAutoFill) CLIQZ.Core.autocompleteQuery(CliqzUtils.cleanMozillaActions(data[0].url));
        
            $(".cliqz-result-item-box").unbind("click").click(function(){ window.top.location.href = $(this).attr("url") });
        
          $('#search-dropdown').show();
      }
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function renderHistory(links){
    var amount = Math.min(links.length,10), array = [];
    
    for (var i=0;i<amount;i++) {
        array.push(i);
        
        var link = links[i];

        var template = $("#history-row-template").clone();

        template.attr("number",i).attr("href",link.url).removeAttr("id").removeClass("hidden").appendTo("#history-lis").css("visibility","hidden");

        template.find(".history-title").text(link.title);
        
        var urlinfo = CliqzUtils.getDetailsFromUrl(link.url),
            logoinfo = CliqzUtils.getLogoDetails(urlinfo),
            icon = template.find(".history-icon").css("background-color",logoinfo.color);

        console.log(urlinfo);
        
        if (icon.img) icon.css("background-image","url(" + logoinfo.img + ")");
        else icon.text(logoinfo.text);
        
        template.find(".history-url.blurred").text(urlinfo.host);
        template.find(".history-url.hovered").text(urlinfo.host + urlinfo.path);
    }
    
    shuffle(array);
    
    var effect = "bounceIn";
    
    for (var i=0;i<amount;i++){
        (function(index){
            setTimeout(function(){ 
                var element = $("#history-lis").children().eq(array[index]).css("visibility","visible");
                
                element.addClass(effect + " animated").one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
                    $(this).removeClass(effect + " animated");
                });
                
            },i * 50);
        })(i);
    }
}