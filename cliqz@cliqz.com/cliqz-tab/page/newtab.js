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

var QuickAccessController = {
    display: function(title,icon,url){
        var template = $("#qa-item-template").clone()

        template.removeAttr("id").removeClass("hidden").attr("href",url).appendTo($("#qa"))

        template.find(".title").text(title)

        var logoinfo = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(url)),
            icon = template.find(".icon").text(logoinfo.text).attr("style",logoinfo.style)
    },
    init: function(){
        var bookmarks = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Components.interfaces.nsINavBookmarksService),
            history = Components.classes["@mozilla.org/browser/nav-history-service;1"].getService(Components.interfaces.nsINavHistoryService),
            query = history.getNewQuery()

        query.setFolders([bookmarks.toolbarFolder], 1)

        var toolbar = history.executeQuery(query, history.getNewQueryOptions()).root

        // Open the folder, and iterate over its contents.
        toolbar.containerOpen = true

        for (var i=0;i<toolbar.childCount;i++) {
            var item = toolbar.getChild(i)

            if (item.type == Components.interfaces.nsINavHistoryResultNode.RESULT_TYPE_FOLDER && item.title == "Cliqzess") {
                item.QueryInterface(Components.interfaces.nsINavHistoryContainerResultNode)
                item.containerOpen = true

                for (var j=0;j<item.childCount;j++) {
                    var bookmark = item.getChild(j)

                    if (bookmark.type == Components.interfaces.nsINavHistoryResultNode.RESULT_TYPE_URI) {
                        this.display(bookmark.title,bookmark.icon,bookmark.uri)
                    }
                }
            }
        }
    }
}

var NewsController = {
    display: function(title,time,url){
        var template = $("#news-item-template").clone()

        template.removeAttr("id").removeClass("hidden").attr("href",url).appendTo($("#news"))

        template.find(".time").text(time)
        template.find(".title").text(title)
    },
    init: function(){
        CliqzUtils.httpGet("https://newbeta.cliqz.com/api/v1/results?q=spiegel&_=" + new Date().getTime(),function(data){
            try {
                var response = JSON.parse(data.response), news = response.extra.results[0].data.news

                for (var i=0,imax=news.length;i<imax;i++) {
                    NewsController.display(news[i].title,news[i].time,news[i].url)
                }
            }
            catch(e) {
                alert(e)
            }
        });
    }
}

var HistoryController = {
    amount: 10,
    nextShownIndex: null,

    pin: function(item,link,index){
        NewTabUtils.pinnedLinks.pin(link,index);
        $(item).addClass("pinned")
    },
    isPinned: function(link) {
        return NewTabUtils.pinnedLinks.isPinned(link)
    },
    unpin: function(item,link){
        NewTabUtils.pinnedLinks.unpin(link);
        $(item).removeClass("pinned")
    },
    hide: function(item,link,index){
        this.lastHidden = link

        this.unpin(item,link)

        NewTabUtils.blockedLinks.block(link)

        $(item).remove()

        for (var i=this.nextShownIndex,imax=this.links.length;i<imax;i++) {
            if (!NewTabUtils.blockedLinks.isBlocked(this.links[i])) {
                this.animate(this.display(this.links[i]).insertBefore($("#history-lis > *").eq(index)))
                this.nextShownIndex ++
                break
            }
        }

        this.popup(true)
    },
    popup: function(show){
        if (show) $("#history-popup").show()
        else $("#history-popup").hide()
    },
    undo: function(all){
        if (all) NewTabUtils.undoAll(function(){ location.reload() });
        else { 
            NewTabUtils.blockedLinks.unblock(this.lastHidden);
            location.reload()
        }

        this.popup(false)
    },
    display: function(link){
        var template = $("#history-row-template").clone();

        template.attr("href",link.url).removeClass("hidden").appendTo($("#history-lis")).css("visibility","hidden");
        template[0].link = link;
        template.find(".history-title").text(link.title);

        if (HistoryController.isPinned(link)) template.addClass("pinned");

        (function(link,template){
            template.find(".close").click(function(e){
                var a = $(this).parents("a:first")
                HistoryController.hide(a,link,$("#history-lis > *").index(a));
                e.preventDefault();
                e.stopPropagation();
            });

            template.find(".pin").click(function(e){
                var a = $(this).parents("a:first")

                e.preventDefault();
                e.stopPropagation();

                if (a.filter(".pinned").length) HistoryController.unpin(template,link);
                else HistoryController.pin(template,link,$("#history-lis > *").index(a));
            });

            template.find(".unpin").click(function(e){
                HistoryController.unpin(link);
                e.preventDefault();
                e.stopPropagation();
                window.location.reload();
            });
        })(link,template);

        var urlinfo = CliqzUtils.getDetailsFromUrl(link.url),
            logoinfo = CliqzUtils.getLogoDetails(urlinfo),
            icon = template.find(".history-icon").text(logoinfo.text).attr("style",logoinfo.style)

        template.find(".history-url.blurred").text(urlinfo.host);
        template.find(".history-url.hovered").text(urlinfo.host + urlinfo.extra);

        return template
    },
    animate: function(item){
        var element = $(item).css("visibility","visible"),
            effect = "bounceIn";

        element.addClass(effect + " animated").one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
            $(this).removeClass(effect + " animated");
        });
    },
    init: function(links){
        this.links = links
        this.nextShownIndex = this.amount

        var amount = Math.min(links.length,this.amount), array = [], list = $("#history-lis");

        for (var i=0;i<amount;i++) {
            array.push(i);
            HistoryController.display(links[i])
        }

        shuffle(array);

        for (var i=0;i<amount;i++)
            (function(index){ setTimeout(function(){ HistoryController.animate($("#history-lis").children().eq(array[index])) },i * 50); })(i);

        Sortable.create(list[0],{
            animation: 150,
            onUpdate: function(e){
                for (var i = e.oldIndex;i > e.newIndex;i--) {
                    var owner = list.children().eq(i)[0]

                    if (HistoryController.isPinned(owner.link)) HistoryController.pin(owner,owner.link,i);
                }

                HistoryController.pin(e.item,e.item.link,e.newIndex)
            }
        });
    }
};

$(function(){
    NewsController.init()

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
                    HistoryController.init(NewTabUtils.links.getLinks());
                });
            },200);
        },
        error: function() {}
    });

    $('#search-dropdown').click(function(ev){
        ev.stopPropagation();
    });

    CLIQZ.UI.init();
    CLIQZ.Core.popup = $('#search-dropdown')[0]
    CLIQZ.Core.popup.closePopup = function(){}
    CLIQZ.Core.popup.hidePopup = function(){}
    CLIQZ.Core.popup.cliqzBox = $('#search-dropdown')[0];

    setTimeout(function(){
        CLIQZ.UI.main(CLIQZ.Core.popup.cliqzBox);
        CLIQZ.Core.urlbar = $('.input-box')[0];
        CLIQZ.Core.urlbar.mInputField = $('.input-box')[0];
    },100);

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

    $("#history-undo").click(function(){ HistoryController.undo(false) })
    $("#history-undo-all").click(function(){ HistoryController.undo(true) })
    $("#history-popup .dismiss").click(function(){ HistoryController.popup(false) })

    QuickAccessController.init()

    /*$(document).click(function(ev){
        $('#search-dropdown').hide();
    });*/


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