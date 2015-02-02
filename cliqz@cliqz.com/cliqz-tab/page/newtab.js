"use strict";

// import firefox modules
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
// this module is default for new tab in FF and provides with top links
Components.utils.import("resource://gre/modules/NewTabUtils.jsm");

var openUILink = function(value){
    if (CliqzUtils.isUrl(value)) {
        if (value.indexOf("http://") == -1 && value.indexOf("https://") == -1) window.top.location.href = "http://" + value;
        else window.top.location.href = value;
    }
    else window.top.location.href = Services.search.currentEngine.getSubmission(value).uri.spec; 
}

$(function(){
    var serverurl = "http://chrome-backgrounds.cliqz.com";
    
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
    
    $('#search-dropdown').click(function(ev){
        ev.stopPropagation();
    });
    
    $(document).click(function(ev){
        $('#search-dropdown').hide();
    });
    
    CLIQZ.UI.init();
    CLIQZ.Core.popup = $('#search-dropdown')[0]
    CLIQZ.Core.popup.closePopup = function(){}
    CLIQZ.Core.popup.hidePopup = function(){}
    CLIQZ.Core.popup.cliqzBox = $('#search-dropdown')[0];
    CLIQZ.UI.main(CLIQZ.Core.popup.cliqzBox);
    CLIQZ.Core.urlbar = $('.input-box')[0];
    CLIQZ.Core.urlbar.mInputField = $('.input-box')[0];
    
    var searchinput = $("#search").keydown(CLIQZ.Core.urlbarkeydown),
        TAB = 9,
        ENTER = 13,
        LEFT = 37,
        UP = 38,
        RIGHT = 39,
        DOWN = 40,
        BACKSPACE = 8,
        DEL = 46;
    
    searchinput.keydown(function(event){
        if (event.keyCode == ENTER) $(this).css("color","white")
    })
    .keyup(function(event){
        switch(event.keyCode) {
            case UP: case DOWN: case TAB: case LEFT: case RIGHT: case KeyEvent.DOM_VK_HOME: break;
            case ENTER:
                if (typeof($("#search-dropdown [selected='true']").attr("idx")) == "undefined") openUILink(this.value)
                
                 $("#search-dropdown").hide()
                 CLIQZ.Core.popup.popupOpen = false
                
                break;
            case DEL: case BACKSPACE: search(this,false); break;
            default: search(this,false);
        }
    });
    
    searchinput.focus(function(){ search(this,false) });
    
    $(window).resize(function(){
        $("#search-dropdown").hide()
        CLIQZ.Core.popup.popupOpen = false
    })
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
        CLIQZ.Core.popup.popupOpen = false
        return;
    }

    CLIQZ.Core.popup.popupOpen = true
    
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

var HistoryController = {
    pin: function(item,link,index){
        NewTabUtils.pinnedLinks.pin(item,link,index);
        $(item).addClass("pinned")
    },
    isPinned: function(link) {
        return NewTabUtils.pinnedLinks.isPinned(link)
    },
    unpin: function(item,link){
        NewTabUtils.pinnedLinks.unpin(item,link);
        $(item).removeClass("pinned")
    },
    hide: function(link){
        NewTabUtils.blockedLinks.block(link)
    }
};


function renderHistory(links){
    var amount = Math.min(links.length,10), array = [], list = $("#history-lis");
    
    for (var i=0;i<amount;i++) {
        array.push(i);
        
        var link = links[i];

        var template = $("#history-row-template").clone();

        template.attr("number",i).attr("href",link.url).removeAttr("id").removeClass("hidden").appendTo(list).css("visibility","hidden");
        template[0].link = link;
        template.find(".history-title").text(link.title);
        
        if (HistoryController.isPinned(link)) template.addClass("pinned");
        
        (function(link){
            template.find(".close").click(function(e){
                HistoryController.hide(link);
                e.preventDefault();
                e.stopPropagation();
                window.location.reload();
            });
            
            template.find(".pin").click(function(e){ HistoryController.pin(link); });
            template.find(".unpin").click(function(e){
                HistoryController.unpin(link);
                e.preventDefault();
                e.stopPropagation();
                window.location.reload();
            });
        })(link);
        
        var urlinfo = CliqzUtils.getDetailsFromUrl(link.url),
            logoinfo = CliqzUtils.getLogoDetails(urlinfo),
            icon = template.find(".history-icon").css("background-color",logoinfo.color);
        
        if (icon.img) icon.css("background-image","url(" + logoinfo.img + ")");
        else icon.text(logoinfo.text);
        
        template.find(".history-url.blurred").text(urlinfo.host);
        template.find(".history-url.hovered").text(urlinfo.host + urlinfo.path);
    }

    Sortable.create(list[0],{
        animation: 150,
        onUpdate: function(e){
            for (var i = e.oldIndex;i > e.newIndex;i--) {
                var owner = list.children().eq(i)[0]
                
                if (HistoryController.isPinned(owner.link)) history.pin(owner,owner.link,i);
            }
            
            HistoryController.pin(e.item,e.item.link,e.newIndex)
        }
    });
    
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

function getLogo(url){
    var base = getDomainBase(url),
        checkRule = function(fulldomain,rule){
            var address = fulldomain.lastIndexOf(base),
                parseddomain = fulldomain.substr(0,address) + "#" + fulldomain.substr(address + base.length)

            return parseddomain.indexOf(rule) != -1
        }
    
    if (rules[base]) {
        for (var i=0,imax=rules[base].length;i<imax;i++) {
            var rule = rules[base][i]
            
            //r, b, l, t, c
            if (checkRule(fulldomain,rule.r)) {
                return {
                    background: rule.b,
                    logo: rule.l,
                    text: rule.t,
                    color: rule.c
                }
            }
        }
    }
    else {
        randomLogo();
    }
}