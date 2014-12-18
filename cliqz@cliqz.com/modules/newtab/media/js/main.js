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
    CLIQZ.UI.init();
    CLIQZ.Core.popup = $('#search-dropdown')[0]
    CLIQZ.Core.popup.cliqzBox = $('#search-dropdown')[0];
    CLIQZ.UI.main(CLIQZ.Core.popup.cliqzBox);
    CLIQZ.Core.urlbar = $('.input-box')[0];
    CLIQZ.Core.urlbar.mInputField = $('.input-box')[0];

      $(document).click(function(ev){
        $('#search-dropdown').hide();
      });

});



var CliqzResults = {
        classID: Components.ID('{59a99d57-b4ad-fa7e-aead-da9d4f4e77c8}'),
        classDescription : 'Cliqz',
        contractID : '@mozilla.org/autocomplete/search;1?name=cliqz-results',
        QueryInterface: XPCOMUtils.generateQI([ Components.interfaces.nsIAutoCompleteSearch ])
};

XPCOMUtils.defineLazyServiceGetter(CliqzResults, 'historyAutoCompleteProvider',
      '@mozilla.org/autocomplete/search;1?name=cliqz-results', 'nsIAutoCompleteSearch');

function search(input){
    CliqzResults.historyAutoCompleteProvider.startSearch(input.value, '', null, {
        onSearchResult: function(search, result) {
           reuseMeFromComponentsXML(result);
        }
    });
}


function reuseMeFromComponentsXML(_this){
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
          CLIQZ.Core.autocompleteQuery(CliqzUtils.cleanMozillaActions(data[0].url));
          $('#search-dropdown').show();
      }
}

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