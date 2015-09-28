(function($){
    var CliqzResults = {
        classID: Components.ID('{59a99d57-b4ad-fa7e-aead-da9d4f4e77c8}'),
        classDescription : 'Cliqz',
        contractID : '@mozilla.org/autocomplete/search;1?name=cliqz-results',
        QueryInterface: XPCOMUtils.generateQI([ Components.interfaces.nsIAutoCompleteSearch ])
    }

    XPCOMUtils.defineLazyServiceGetter(CliqzResults,
                                       'historyAutoCompleteProvider',
                                       '@mozilla.org/autocomplete/search;1?name=cliqz-results',
                                       'nsIAutoCompleteSearch')

    var reuseMeFromComponentsXML = function (_this,skipAutoFill,input,dropdown,collapse){
            if (input.value == "") {
                collapse()
                return
            }

            CLIQZ.Core.popup.popupOpen = true

            function unEscapeUrl(url){
                return Components.classes['@mozilla.org/intl/texttosuburi;1']
                                 .getService(Components.interfaces.nsITextToSubURI)
                                 .unEscapeURIForUI('UTF-8', url)
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

                CLIQZ.UI.results({ q: q, results: data, width: CLIQZ.Core.urlbar.clientWidth })

                if (!skipAutoFill) CLIQZ.Core.autocompleteQuery(CliqzUtils.cleanMozillaActions(data[0].url))

                dropdown.show();
            }
        },
        searchProto = function(input,dropdown,collapse,skipAutoFill) {
            CliqzResults.historyAutoCompleteProvider.startSearch(input.value, 'enable-actions', null, {
                onSearchResult: function(search, result) {
                   reuseMeFromComponentsXML(result,skipAutoFill,input,dropdown,collapse);
                }
            });
        }

    $.fn.cliqz = function(selector){
        var input = this,
            dropdown = $(selector),
            collapse = function() {
                dropdown.hide()
                CLIQZ.Core.popup.popupOpen = false
            },
            search = searchProto.bind(null,this[0],dropdown,collapse,false)

        this.attr("placeholder",CliqzUtils.getWindow().document.getElementById("urlbar").placeholder);

        CLIQZ.Core.popup = dropdown[0]
        CLIQZ.Core.popup.closePopup = function(){}
        CLIQZ.Core.popup.hidePopup = function(){}
        CLIQZ.Core.popup.cliqzBox = dropdown[0]
        CLIQZ.UI.init()
        CLIQZ.UI.main(CLIQZ.Core.popup.cliqzBox)
        CLIQZ.Core.urlbar = input[0];
        CLIQZ.Core.urlbar.mInputField = input[0]

        var TAB = 9,
            ENTER = 13,
            LEFT = 37,
            UP = 38,
            RIGHT = 39,
            DOWN = 40,
            BACKSPACE = 8,
            DEL = 46

        input.keydown(CLIQZ.Core.urlbarkeydown)
             .keydown(function(event){ if (event.keyCode == ENTER) $(this).css("color","white") })
             .keyup(function(event){
                 switch(event.keyCode) {
                     case UP: case DOWN: case TAB: case LEFT: case RIGHT: case KeyEvent.DOM_VK_HOME: break;
                     case ENTER:
                         if (typeof(dropdown.find("[selected='true']").attr("idx")) == "undefined") openUILink(this.value)

                         collapse()

                         break;
                     case DEL: case BACKSPACE: search(); break;
                     default: search();
                 }
             })
             .focus(function(){ search() })

        dropdown.click(function(e){ e.stopPropagation() })

        $(document).click(collapse)

        $(window).resize(collapse)
    }
})(jQuery);
