'use strict';
/*
 *
 */


const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzExtOnboarding'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHandlebars',
  'chrome://cliqzmodules/content/CliqzHandlebars.jsm');

var CliqzExtOnboarding = {
	// FIXME: get new window ref if this happens in new window
    win: Components.classes['@mozilla.org/appshell/window-mediator;1']
        .getService(Components.interfaces.nsIWindowMediator)
        .getMostRecentWindow("navigator:browser"),

    callout: undefined,
    lastPrefs: undefined,

    // maximum number of times we interrupt the user
    MAX_INTERRUPTS: 3,
    // number of results required before we interrupt
    REQUIREED_RESULTS_COUNT: 0,


    onSameResult: function (request, resultIndex, destinationUrl) {
    	var isActive = CliqzUtils.getPref("extended_onboarding_same_result", false);
    	if (!isActive) {
    		this._log("same result AB test not active; aborting");
    		return;
    	}

        var prefs = CliqzUtils.getPref("extended_onboarding", undefined);
        var maxShow = 3;
        var resultCountThreshold = 4;
        if (prefs) {
            try {
                prefs = JSON.parse(prefs)["same_result"];
            } catch (e) { }
        }
        if (!prefs) {
            prefs = {
                "state": "seen",
                "log": [],
                "show_count": 0
            };
            CliqzUtils.log("ext_onboarding: creating prefs");
        }

        if (prefs["state"] == "discarded") {
            CliqzUtils.log("ext_onboarding: user had discarded before; not interrupting");
            return;
        } else if (prefs["log"].length >= CliqzExtOnboarding.MAX_INTERRUPTS) {
            CliqzUtils.log("ext_onboarding: max. show reached; not interrupting");
            return;
        } else if (prefs["show_count"] < CliqzExtOnboarding.REQUIREED_RESULTS_COUNT) {
            prefs["show_count"]++;
            CliqzUtils.setPref("extended_onboarding", JSON.stringify(
                { "same_result": prefs }));                    
            CliqzUtils.log("ext_onboarding: got only " + 
                (prefs["show_count"] - 1) + " result clicks so far, waiting for " + resultCountThreshold);
            return;
        }

        prefs["show_count"] = 0;
        var anchor = CliqzExtOnboarding.win.CLIQZ.Core.popup.cliqzBox.resultsBox.children[resultIndex];
        CliqzExtOnboarding.lastPrefs = prefs;
        if (anchor) {
            if (anchor.offsetTop < 300) {                                    
                CliqzExtOnboarding.win.CLIQZ.Core.popup._openAutocompletePopup(
                    CliqzExtOnboarding.win.CLIQZ.Core.urlbar, CliqzExtOnboarding.win.CLIQZ.Core.urlbar);
                CliqzExtOnboarding._getCallout(destinationUrl).openPopup(anchor,
                    "end_before", -5, 0);
                CliqzExtOnboarding.callout.setAttribute("show_ts", Date.now());
                request.cancel("CLIQZ_INTERRUPT");
                CliqzUtils.log("ext_onboarding: interrupted");
            }
            else {
                CliqzUtils.log("ext_onboarding: result was below the fold");
            }
        } else {
            CliqzUtils.log("ext_onboarding: result was not shown to user");
        }                            
    },

	_getCallout: function (dest_url) {
        if (!this.callout) {
            var container = this.win.document.createElement('panel'),
                content = this.win.document.createElement('div'),
                parent = this.win.CLIQZ.Core.popup.parentElement;

            container.className = 'onboarding-container';
            content.className = "onboarding-callout";
            container.setAttribute("type", "arrow");
            container.style.marginLeft ='0px';
            container.style.marginTop = '0px';
            container.setAttribute("level", "top");
            container.setAttribute("position", "topleft topleft");
            container.appendChild(content);    
            parent.appendChild(container);

            content.innerHTML = CliqzHandlebars.tplCache['onboarding-callout-extended']({
                message: CliqzUtils.getLocalizedString("onCalloutGoogle"),
                options: [
                    { label: CliqzUtils.getLocalizedString("onCalloutGoogleBtnOk"), action: 'onboarding-start', state: 'ok' },
                    { label: CliqzUtils.getLocalizedString("onCalloutGoogleBtnCancel"), action: 'onboarding-cancel', state: 'cancel' }
                ],
                // FIXME: not shown
                cliqz_logo: 'chrome://cliqzres/content/skin/img/cliqz.svg'
            });

            container.addEventListener('click', function (e) {
                var target = e.target;
                if (target && (e.button == 0 || e.button == 1)) {
                    var action = target.getAttribute('cliqz-action');
                    var duration = Date.now() - CliqzExtOnboarding.callout.getAttribute("show_ts");
                    switch (action) {                        
                        case 'onboarding-start':
                            CliqzExtOnboarding.win.CLIQZ.Core.popup.hidePopup();
                            container.hidePopup();
                            CliqzExtOnboarding.win.CLIQZ.Core.openLink(dest_url, false);
                            CliqzUtils.log("ext_onboarding: clicked on ok; remind user again in a bit");
                            
                            CliqzExtOnboarding.lastPrefs["state"] = "seen";
                            CliqzExtOnboarding.lastPrefs["log"].push({
                                "duration": duration,
                                "action": "ok"
                            });
                            CliqzUtils.setPref("extended_onboarding", JSON.stringify(
                                { "same_result": CliqzExtOnboarding.lastPrefs }));
                            break;
                        case 'onboarding-cancel':
                            CliqzExtOnboarding.win.CLIQZ.Core.popup.hidePopup();
                            container.hidePopup();
                            CliqzExtOnboarding.win.CLIQZ.Core.openLink(dest_url, false);
                            CliqzUtils.log("ext_onboarding: clicked on cancel; don't remind user again");

                            CliqzExtOnboarding.lastPrefs["state"] = "discarded";
                            CliqzExtOnboarding.lastPrefs["log"].push({
                                "duration": duration,
                                "action": "discard"
                            });
                            CliqzUtils.setPref("extended_onboarding", JSON.stringify(
                                { "same_result": CliqzExtOnboarding.lastPrefs }));
                            break;
                    }
                }
            });

            // close callout whenever dropdown closes
            CliqzExtOnboarding.win.CLIQZ.Core.popup.addEventListener("popuphidden", function () {
                if (CliqzExtOnboarding.callout.state == "open") {
                    CliqzExtOnboarding.callout.hidePopup();

                    var duration = Date.now() - CliqzExtOnboarding.callout.getAttribute("show_ts");
                    CliqzExtOnboarding.lastPrefs["state"] = "seen";
                    CliqzExtOnboarding.lastPrefs["log"].push({
                        "duration": duration,
                        "action": "other"
                    });
                    CliqzUtils.setPref("extended_onboarding", JSON.stringify(
                        { "same_result": CliqzExtOnboarding.lastPrefs }));                    
                }
            });  

            this.callout = container;
        }
        return this.callout;
    },

	_log: function (msg) {
		CliqzUtils.log(msg, 'CliqzExtOnboarding');
	}
}
