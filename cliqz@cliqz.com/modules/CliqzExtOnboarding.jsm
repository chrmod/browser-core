'use strict';
/*
 *
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzExtOnboarding'];

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHandlebars',
  'chrome://cliqzmodules/content/CliqzHandlebars.jsm');

var lastPrefs = undefined,
    // cache destination URL
    destUrl = undefined,
    wasUnloaded = false;

var CliqzExtOnboarding = {
    // maximum number of times we interrupt the user
    MAX_INTERRUPTS: 100, // 3
    // number of results required before we interrupt
    REQUIRED_RESULTS_COUNT: 0, // 5
    CALLOUT_DOM_ID: "cliqzExtOnboardingCallout",

    // called for each new window
    init: function () {
        // workaround: after de- and re-activating the extension,
        // CliqzUtils and CliqzHandlebars point to outdated objects
        // and defineLazyModuleGetter does not reload them
        if (wasUnloaded) {
            Cu.import('chrome://cliqzmodules/content/CliqzUtils.jsm');   
            Cu.import('chrome://cliqzmodules/content/CliqzHandlebars.jsm');   
            wasUnloaded = false;      
        }

        CliqzExtOnboarding._log("init: initializing");

        var callout = CliqzExtOnboarding._createCallout();
        CliqzExtOnboarding._addCalloutListeners(callout);
        CliqzExtOnboarding._addDropdownListeners(callout);

        CliqzExtOnboarding._log("init: done");
    },

    unload: function () {
        CliqzExtOnboarding._log("unload: unloading...");

        var callout = CliqzExtOnboarding._getCallout();
        if (callout) {
            CliqzExtOnboarding._removeCalloutListeners(callout);
            CliqzExtOnboarding._removeDropdownListeners();
            CliqzExtOnboarding._destroyCallout(callout);
        } else {
            CliqzExtOnboarding._log("unload: callout is not defined"); 
        }

        CliqzExtOnboarding._log("unload: done");

        wasUnloaded = true;
    },

    onSameResult: function (request, resultIndex, destinationUrl) {
        var isActive = CliqzUtils.getPref("extended_onboarding_same_result", false);
        if (!isActive) {
            CliqzExtOnboarding._log("same result AB test not active; aborting");
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
            CliqzExtOnboarding._log("creating prefs");
        }

        // checking for reasons _not_ to interrupt the users...
        if (prefs["state"] == "discarded") {
            CliqzExtOnboarding._log("user had discarded before; not interrupting");
            return;
        } else if (prefs["show_count"] >= CliqzExtOnboarding.MAX_INTERRUPTS) {
            CliqzExtOnboarding._log("max. show reached; not interrupting");
            return;
        } else if (prefs["result_count"] < CliqzExtOnboarding.REQUIRED_RESULTS_COUNT) {
            prefs["result_count"]++;
            CliqzUtils.setPref("extended_onboarding", JSON.stringify(
                { "same_result": prefs }));                    
            CliqzExtOnboarding._log("not enough result clicks so far; not interrupting");
            return;
        }

        // ...seems we should interrupt the user
        prefs["result_count"] = 0;
        var win = CliqzUtils.getWindow(),
            callout = CliqzExtOnboarding._getCallout(),
            anchor = win.CLIQZ.Core.popup.cliqzBox.resultsBox.children[resultIndex];

        if (anchor) {
            if (anchor.offsetTop < 300) {  
                lastPrefs = prefs;
                destUrl = destinationUrl;

                win.CLIQZ.Core.popup._openAutocompletePopup(
                    win.CLIQZ.Core.urlbar, win.CLIQZ.Core.urlbar);
                callout.openPopup(anchor, "end_before", -5, 0);
                callout.setAttribute("show_ts", Date.now());

                request.cancel("CLIQZ_INTERRUPT");
                CliqzExtOnboarding._log("interrupted");
                CliqzExtOnboarding._telemetry("show", {
                    count: prefs["show_count"],
                    result_index: resultIndex
                });
            }
            else {
                CliqzExtOnboarding._log("result was below the fold");
            }
        } else {
            CliqzExtOnboarding._log("result was not shown to user");
        }                            
    },

    // create callout element and attach to DOM
    _createCallout: function () {
        var win = CliqzUtils.getWindow(),
            callout = win.document.createElement('panel'),
            content = win.document.createElement('div'),
            parent = win.CLIQZ.Core.popup.parentElement;
        
        callout.className = "onboarding-container";
        content.className = "onboarding-callout";

        callout.setAttribute("id", CliqzExtOnboarding.CALLOUT_DOM_ID);
        callout.setAttribute("type", "arrow");
        callout.setAttribute("level", "top");
        callout.setAttribute("ignorekeys", "true");

        // set HTML content
        CliqzExtOnboarding._initCalloutContent(content);

        callout.appendChild(content);
        parent.appendChild(callout);

        return callout;
    },

    _getCallout: function () {
        return CliqzUtils.getWindow().
            document.getElementById(CliqzExtOnboarding.CALLOUT_DOM_ID)
    },

    _initCalloutContent: function (contentElement) {
        // wait until template has been loaded
        if (!CliqzHandlebars.tplCache["onboarding-callout-extended"]) {
            CliqzUtils.setTimeout(function () {
                CliqzExtOnboarding._initCalloutContent(contentElement);
            }, 250);
            CliqzExtOnboarding._log("_initCalloutContent: templates not ready; waiting");
            return;
        }

        contentElement.innerHTML = CliqzHandlebars.tplCache["onboarding-callout-extended"]({
            message: CliqzUtils.getLocalizedString("onCalloutGoogle"),
            options: [
                { label: 
                    CliqzUtils.getLocalizedString("onCalloutGoogleBtnOk"), 
                    action: "onboarding-start", state: "ok" },
                { label: 
                    CliqzUtils.getLocalizedString("onCalloutGoogleBtnCancel"), 
                    action: "onboarding-cancel", state: "cancel" }
            ],
            // FIXME: not shown
            cliqz_logo: "chrome://cliqzres/content/skin/img/cliqz.svg"
        });

        CliqzExtOnboarding._log("_initCalloutContent: template parsed");
        CliqzExtOnboarding._log(contentElement.innerHTML);
    },

    _destroyCallout: function (callout) {
        callout.parentNode.removeChild(callout);
    },

    // handle user clicks on ok and cancel buttons
    _addCalloutListeners: function (callout) {
        callout.addEventListener("click", CliqzExtOnboarding._calloutClickListener);
    },

    _removeCalloutListeners: function (callout) {
        callout.removeEventListener("click", CliqzExtOnboarding._calloutClickListener);
    },

    // FIXME: this might be attached/dettached from different window instances
    // close callout when dropdown closes (e.g., user clicking on result)
    _addDropdownListeners: function (callout) {
        CliqzUtils.getWindow().CLIQZ.Core.popup.
            addEventListener("popuphidden", CliqzExtOnboarding._dropdownCloseListener);
    },

    _removeDropdownListeners: function () {
        var enumerator = 
            Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            win.CLIQZ.Core.popup.
                removeEventListener("popuphidden", CliqzExtOnboarding._dropdownCloseListener);
        }

        // CliqzUtils.getWindow().CLIQZ.Core.popup.
        //     removeEventListener("popuphidden", CliqzExtOnboarding._dropdownCloseListener);
    },

    _calloutClickListener: function (e) {
        var target = e.target;
        if (target && (e.button == 0 || e.button == 1)) {
            var win = CliqzUtils.getWindow(),
                callout = CliqzExtOnboarding._getCallout(),
                action = target.getAttribute("cliqz-action"),
                duration = Date.now() - callout.getAttribute("show_ts");
                
            // to indicate to the popup hiding event that
            // we are already handling this here
            callout.setAttribute("show_ts", -1);
            
            switch (action) {                        
                case "onboarding-start":
                    CliqzExtOnboarding._log("clicked on ok; remind user again in a bit");
                    
                    lastPrefs["state"] = "seen";
                    lastPrefs["show_count"]++;
                    lastPrefs["max_show_duration"] =
                        Math.max(lastPrefs["max_show_duration"], duration);
                    
                    CliqzUtils.setPref("extended_onboarding", JSON.stringify(
                        { "same_result": lastPrefs }));

                    CliqzExtOnboarding._telemetry("close", {
                        duration: duration,
                        reason: "ok"
                    });

                    callout.hidePopup();
                    win.CLIQZ.Core.popup.hidePopup();
                    win.CLIQZ.Core.openLink(destUrl, false);

                    break;

                case "onboarding-cancel":
                    CliqzExtOnboarding._log("clicked on cancel; don't remind user again");

                    lastPrefs["state"] = "discarded";
                    lastPrefs["show_count"]++;
                    lastPrefs["max_show_duration"] =
                        Math.max(lastPrefs["max_show_duration"], duration);

                    CliqzUtils.setPref("extended_onboarding", JSON.stringify(
                        { "same_result": lastPrefs }));

                    CliqzExtOnboarding._telemetry("close", {
                        duration: duration,
                        reason: "discard"
                    });

                    callout.hidePopup();
                    win.CLIQZ.Core.popup.hidePopup();
                    win.CLIQZ.Core.openLink(destUrl, false);

                    break;
            }
        }
    },

    _dropdownCloseListener: function () {
        var callout = CliqzExtOnboarding._getCallout();
        // close callout whenever dropdown closes
        if (callout.state == "open") {
            // we already handled this close event (user clicked on button)
            var showTs = callout.getAttribute("show_ts");

            if (showTs == -1) {
                CliqzExtOnboarding._log("callout close event handled previously");
                return;
            }

            var duration = Date.now() - callout.getAttribute("show_ts");

            lastPrefs["state"] = "seen";
            lastPrefs["show_count"]++;
            lastPrefs["max_show_duration"] =
                Math.max(lastPrefs["max_show_duration"], duration);

            CliqzUtils.setPref("extended_onboarding", JSON.stringify(
                { "same_result": lastPrefs }));

            CliqzExtOnboarding._telemetry("close", {
                duration: duration,
                reason: "other"
            });  

            callout.hidePopup();            
        }
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
    }
}
