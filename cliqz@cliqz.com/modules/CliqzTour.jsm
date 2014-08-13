'use strict';
var EXPORTED_SYMBOLS = ['CliqzTour'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.5.00');

var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
             .getService(Components.interfaces.nsIWindowMediator),
    win = wm.getMostRecentWindow("navigator:browser");

var text = 'Was ist cliqz?', pos = 0, urlBar, highlightPopup,
    fin = "Was ist cliqz? <-- probier es jetzt selbst und gib z.B. 'Mario Gotze' ein!",
    results = [
        {
            title : 'FAQ',
            url   : 'http://beta.cliqz.com/faq',
            type  : 'cliqz-results sources-o'
        },
        {
            title : 'Datenschutz',
            url   : 'http://beta.cliqz.com/datenschutz.html',
            type  : 'cliqz-results sources-o'
        },
        {
            title : 'Team',
            url   : 'http://cliqz.com/company/team',
            type  : 'cliqz-results sources-o'
        },
        {
            title : 'Values',
            url   : 'http://cliqz.com/company/values',
            type  : 'cliqz-results sources-o'
        },
        {
            title : 'Impressum',
            url   : 'http://cliqz.com/company/impressum',
            type  : 'cliqz-results sources-o'
        },
        {
            title : 'Cliqz',
            url   : 'http://beta.cliqz.com',
            type  : 'cliqz-results sources-o'
        }
    ];

var CliqzTour = {
    start: function(){
        var action = {
            type: 'activity',
            action: 'offboarding_tour',
        };
        CliqzUtils.track(action);
        start('wobble');
    }
};

function start(effect){
    var highlighter = win.document.getElementById('UITourHighlight');

    highlightPopup = highlighter.parentElement;
    urlBar = win.document.getElementById('urlbar');
    pos = 0;

    highlighter.setAttribute("active", effect);
    highlightPopup.hidden = false;

    if (highlightPopup.state == "showing" || highlightPopup.state == "open") {
        highlightPopup.hidePopup();
    }

    highlightPopup.openPopup(urlBar, "overlap", 15, -12);
    highlightPopup.style.transition = 'all 4s linear';
    highlightPopup.style.marginLeft = '65px';

    win.CLIQZ.Core.urlbar.mInputField.focus();
    urlBar.mInputField.setUserInput(text.substr(0, ++pos));
    messageType(300);
}

function messageType(to){
    CliqzUtils.setTimeout(function(){
        urlBar.value = text.substr(0, ++pos);
        if(pos < text.length)messageType(300);
        else {
            CliqzUtils.setTimeout(function(){
                highlightPopup.hidePopup();
                highlightPopup.style.transition = '';
                highlightPopup.style.marginLeft = '';

                urlBar.popup.mInput = urlBar;
                var width = urlBar.getBoundingClientRect().width;
                urlBar.popup.setAttribute("width", width > 100 ? width : 100);
                urlBar.popup.openPopup(urlBar, "after_start", 0, 0, false, true);
                win.CLIQZ.UI.suggestions(['cliqz'], 'cl');
                win.CLIQZ.UI.results({
                    results: results,
                    width: win.CLIQZ.Core.urlbar.clientWidth - 100
                });
                CliqzUtils.setTimeout(function(){
                    urlBar.value = fin;
                    urlBar.setSelectionRange(0, urlBar.value.length)
                }, 2000);

            }, 1000)
        }
    }, to);
}
//setTimeout(function(){
//    start(doc, 'wobble');
//},1000);
