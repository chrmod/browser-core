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
    callout: undefined,
    lastPrefs: undefined,

    // maximum number of times we interrupt the user
    MAX_INTERRUPTS: 3,
    // number of results required before we interrupt
    REQUIRED_RESULTS_COUNT: 5,


    onSameResult: function (request, resultIndex, destinationUrl) {
    	var isActive = CliqzUtils.getPref("extended_onboarding_same_result", false);
    	if (!isActive) {
    		this._log("same result AB test not active; aborting");
    		return;
    	}

    	// getting current state from user prefs
        var prefs = CliqzUtils.getPref("extended_onboarding", undefined);
        if (prefs) {
            try {
                prefs = JSON.parse(prefs)["same_result"];
            } catch (e) { }
        }
        if (!prefs) {
            prefs = {
                "state": "seen",
                "result_count": 0,
                "show_count": 0,
                "max_show_duration": 0
            };
            this._log("creating prefs");
        }

        // checking for reasons _not_ to interrupt the users...
        if (prefs["state"] == "discarded") {
            this._log("user had discarded before; not interrupting");
            return;
        } else if (prefs["show_count"] >= CliqzExtOnboarding.MAX_INTERRUPTS) {
            this._log("max. show reached; not interrupting");
            return;
        } else if (prefs["result_count"] < CliqzExtOnboarding.REQUIRED_RESULTS_COUNT) {
            prefs["result_count"]++;
            CliqzUtils.setPref("extended_onboarding", JSON.stringify(
                { "same_result": prefs }));                    
            this._log("not enoygh result clicks so far; not interrupting");
            return;
        }

        // ...seems we should interrupt the user
        prefs["result_count"] = 0;
        var win = this._getWin();
        var anchor = win.CLIQZ.Core.popup.cliqzBox.resultsBox.children[resultIndex];
        CliqzExtOnboarding.lastPrefs = prefs;
        if (anchor) {
            if (anchor.offsetTop < 300) {                                    
                win.CLIQZ.Core.popup._openAutocompletePopup(
                   	win.CLIQZ.Core.urlbar, win.CLIQZ.Core.urlbar);
                CliqzExtOnboarding._getCallout(destinationUrl).openPopup(anchor,
                    "end_before", -5, 0);
                CliqzExtOnboarding.callout.setAttribute("show_ts", Date.now());
                request.cancel("CLIQZ_INTERRUPT");
                this._log("interrupted");
                this._telemetry("show", {
                	count: prefs["show_count"],
                	result_index: resultIndex
                });
            }
            else {
                this._log("result was below the fold");
            }
        } else {
            this._log("result was not shown to user");
        }                            
    },

    _getWin: function () {
    	return Components.classes['@mozilla.org/appshell/window-mediator;1']
		    .getService(Components.interfaces.nsIWindowMediator)
		    .getMostRecentWindow("navigator:browser");
	},
	_getCallout: function (dest_url) {
        if (!this.callout) {
        	var win = this._getWin();
            var container = win.document.createElement('panel'),
                content = win.document.createElement('div'),
                parent = win.CLIQZ.Core.popup.parentElement;

            container.className = 'onboarding-container';
            content.className = "onboarding-callout";
            container.setAttribute("type", "arrow");
            container.style.marginLeft ='0px';
            container.style.marginTop = '0px';
            container.setAttribute("level", "top");
            container.setAttribute("position", "topleft topleft");
            container.appendChild(content);    
            parent.appendChild(container);

            content.innerHTML = CliqzHandlebars.tplCache["onboarding-callout-extended"]({
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
                    CliqzExtOnboarding.callout.setAttribute("show_ts", -1);
                    switch (action) {                        
                        case 'onboarding-start':
                            win.CLIQZ.Core.popup.hidePopup();
                            container.hidePopup();
                            win.CLIQZ.Core.openLink(dest_url, false);
                            CliqzExtOnboarding._log("clicked on ok; remind user again in a bit");
                            
                            CliqzExtOnboarding.lastPrefs["state"] = "seen";
                            CliqzExtOnboarding.lastPrefs["show_count"]++;
                            CliqzExtOnboarding.lastPrefs["max_show_duration"] =
                            	Math.max(CliqzExtOnboarding.lastPrefs["max_show_duration"], duration);
                            
                            CliqzUtils.setPref("extended_onboarding", JSON.stringify(
                                { "same_result": CliqzExtOnboarding.lastPrefs }));

                            CliqzExtOnboarding._telemetry("close", {
                            	duration: duration,
                            	reason: "ok"
			                });
                            break;
                        case 'onboarding-cancel':
                            win.CLIQZ.Core.popup.hidePopup();
                            container.hidePopup();
                            win.CLIQZ.Core.openLink(dest_url, false);
                            CliqzExtOnboarding._log("clicked on cancel; don't remind user again");

                            CliqzExtOnboarding.lastPrefs["state"] = "discarded";
                            CliqzExtOnboarding.lastPrefs["show_count"]++;
                            CliqzExtOnboarding.lastPrefs["max_show_duration"] =
                            	Math.max(CliqzExtOnboarding.lastPrefs["max_show_duration"], duration);

                            CliqzUtils.setPref("extended_onboarding", JSON.stringify(
                                { "same_result": CliqzExtOnboarding.lastPrefs }));

                            CliqzExtOnboarding._telemetry("close", {
                            	duration: duration,
                            	reason: "discard"
			                });
                            break;
                    }
                }
            });

            // close callout whenever dropdown closes
            win.CLIQZ.Core.popup.addEventListener("popuphidden", function () {
                if (CliqzExtOnboarding.callout.state == "open") {
                    CliqzExtOnboarding.callout.hidePopup();

                    // we already handled this close event (user clicked on button)
                    var showTs = CliqzExtOnboarding.callout.getAttribute("show_ts");
                    if (showTs == -1) {
                    	CliqzExtOnboarding._log("callout close event handled previously");
                    	return;
                    }

                    var duration = Date.now() - CliqzExtOnboarding.callout.getAttribute("show_ts");
                    CliqzExtOnboarding.lastPrefs["state"] = "seen";
                    CliqzExtOnboarding.lastPrefs["show_count"]++;
                    CliqzExtOnboarding.lastPrefs["max_show_duration"] =
                        Math.max(CliqzExtOnboarding.lastPrefs["max_show_duration"], duration);

                    CliqzUtils.setPref("extended_onboarding", JSON.stringify(
                        { "same_result": CliqzExtOnboarding.lastPrefs }));

                    CliqzExtOnboarding._telemetry("close", {
                    	duration: duration,
                    	reason: "other"
	                });              
                }
            });  

            this.callout = container;
        }
        return this.callout;
    },

	_log: function (msg) {
		CliqzUtils.log(msg, 'CliqzExtOnboarding');
	},
	_telemetry: function (action, data) {
        var signal = {
            type: 'extended_onboarding',
            // make configurable once there are more components
            component: 'same_result',
            action: action
        };

        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                signal[key] = data[key];
            }
        }

        CliqzUtils.telemetry(signal);
    },
}
