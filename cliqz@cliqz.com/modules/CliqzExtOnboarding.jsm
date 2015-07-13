'use strict';
/*
 *
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzExtOnboarding'];

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');


XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHandlebars',
  'chrome://cliqzmodules/content/CliqzHandlebars.jsm');

var lastPrefs = undefined,
    // cache destination URL
    destUrl = undefined;


// cache autocomplete state
var currentAutocompleteUrlbar = "",
    currentAutocompleteMinSelectionStart = 0;

var CliqzExtOnboarding = {
    // maximum number of times we interrupt the user
    MAX_INTERRUPTS: 3, // 3
    // number of results required before we interrupt
    REQUIRED_RESULTS_COUNT: 5, // 5
    KEYCODE_ENTER: 13,
    CALLOUT_DOM_ID: "cliqzExtOnboardingCallout",

    // called for each new window
    init: function (win) {
        CliqzExtOnboarding._log("init: initializing");

        var callout = CliqzExtOnboarding._createCallout(win);
        CliqzExtOnboarding._addCalloutListeners(callout);
        CliqzExtOnboarding._addDropdownListeners(win);
        CliqzExtOnboarding._addUrlbarKeydownListener(win);

        CliqzExtOnboarding._log("init: done");
    },

    unload: function (win) {
        CliqzExtOnboarding._log("unload: unloading...");

        CliqzExtOnboarding._removeDropdownListeners(win);
        var callout = CliqzExtOnboarding._getCallout(win);
        if (callout) {
            CliqzExtOnboarding._removeCalloutListeners(callout);
            CliqzExtOnboarding._destroyCallout(callout);
        } else {
            CliqzExtOnboarding._log("unload: no callout element found");
        }
        CliqzExtOnboarding._removeUrlbarKeydownListener(win);

        CliqzExtOnboarding._log("unload: done");
    },

    onSameResult: function (request, resultIndex, destinationUrl) {
        var isActive = CliqzUtils.getPref("extended_onboarding_same_result", false);
        if (!isActive) {
            CliqzExtOnboarding._log("onSameResult: same result AB test not active; aborting");
            return;
        }

        try {
            var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                .getService(Components.interfaces.nsIXULAppInfo);
            var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                .getService(Components.interfaces.nsIVersionComparator);

            // running under Firefox 36.0 or later
            if(versionChecker.compare(appInfo.version, "36.0") < 0) {
                CliqzExtOnboarding._log("onSameResult: requires Firefox 36.0 or higher");
                return;
            }
        } catch (e) {
            CliqzExtOnboarding._log("onSameResult: unable to check Firefox version");
            return;
        }

        // getting current state from user prefs
        var prefs = CliqzUtils.getPref("extended_onboarding", undefined);
        if (prefs) {
            try {
                prefs = JSON.parse(prefs)["same_result"];
                // for those users who were already in the AB test when
                // "sub_group" was introduced
                if (!prefs.hasOwnProperty("sub_group")) {
                    prefs["sub_group"] = "na";
                    CliqzUtils.setPref("extended_onboarding", JSON.stringify(
                        { "same_result": prefs }));
                }
            } catch (e) { }
        }
        if (!prefs) {
            prefs = {
                "state": "seen",
                "result_count": 0,
                "show_count": 0,
                "max_show_duration": 0,
                "sub_group": "tbd" // set only when we would show the message for the first time
            };
            CliqzExtOnboarding._log("creating prefs");
        }

        // checking for reasons _not_ to interrupt the users...
        if (prefs["state"] == "discarded") {
            CliqzExtOnboarding._log("onSameResult: user had discarded before; not interrupting");
            return;
        } else if (prefs["show_count"] >= CliqzExtOnboarding.MAX_INTERRUPTS) {
            CliqzExtOnboarding._log("onSameResult: max. show reached; not interrupting");
            return;
        } else if (prefs["result_count"] < CliqzExtOnboarding.REQUIRED_RESULTS_COUNT) {
            prefs["result_count"]++;
            CliqzUtils.setPref("extended_onboarding", JSON.stringify(
                { "same_result": prefs }));
            CliqzExtOnboarding._log("onSameResult: not enough result clicks so far; not interrupting");
            return;
        }

        // decide which subgroup we are going to be in
        if (prefs["sub_group"] == "tbd") {            
            prefs["sub_group"] = (Math.random(1) < .5) ? "show" : "no_show";
            CliqzExtOnboarding._log("decided for subgroup " + prefs["sub_group"]);
            CliqzUtils.setPref("extended_onboarding", JSON.stringify(
                { "same_result": prefs }));
        }

        // ...seems we should interrupt the user
        prefs["result_count"] = 0;
        var win = CliqzUtils.getWindow(),
            callout = CliqzExtOnboarding._getCallout(),
            anchor = win.CLIQZ.Core.popup.cliqzBox.resultsBox.children[resultIndex];

        if (anchor) {
            if (anchor.offsetTop < 300) {
                if (prefs["sub_group"] == "no_show") {
                    CliqzExtOnboarding._log("user is in sub_group no show: do nothing");
                    return;
                }

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
                CliqzExtOnboarding._log("onSameResult: result was below the fold");
            }
        } else {
            CliqzExtOnboarding._log("onSameResult: result was not shown to user");
        }
    },

    // create callout element and attach to DOM
    _createCallout: function (win) {
        win = win || CliqzUtils.getWindow();

        var callout = win.document.createElement('panel'),
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

    _getCallout: function (win) {
        win = win || CliqzUtils.getWindow();

        return win.document.getElementById(CliqzExtOnboarding.CALLOUT_DOM_ID)
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
    },

    _destroyCallout: function (callout) {
        callout.parentNode.removeChild(callout);
    },

    // handle user clicks on ok and cancel buttons
    _addCalloutListeners: function (callout) {
        callout.addEventListener("click", CliqzExtOnboarding._calloutClickListener);
        callout.addEventListener("popuphidden", CliqzExtOnboarding._calloutCloseListener);
    },

    _removeCalloutListeners: function (callout) {
        callout.removeEventListener("click", CliqzExtOnboarding._calloutClickListener);
        callout.removeEventListener("popuphidden", CliqzExtOnboarding._calloutCloseListener);
    },

    _addDropdownListeners: function (win) {
        win.CLIQZ.Core.popup.
            addEventListener("popuphidden", CliqzExtOnboarding._dropdownCloseListener);
    },

    _removeDropdownListeners: function (win) {
        win.CLIQZ.Core.popup.
            removeEventListener("popuphidden", CliqzExtOnboarding._dropdownCloseListener);
    },

    _addUrlbarKeydownListener: function (win) {
        win.CLIQZ.Core.urlbar.
            addEventListener("keydown", CliqzExtOnboarding._urlbarKeydownListener);
    },

    _removeUrlbarKeydownListener: function (win) {
        win.CLIQZ.Core.urlbar.
            removeEventListener("keydown", CliqzExtOnboarding._urlbarKeydownListener);
    },

    _calloutClickListener: function (e) {
        var target = e.target;
        if (target && (e.button == 0 || e.button == 1)) {
            var win = CliqzUtils.getWindow(),
                callout = CliqzExtOnboarding._getCallout(),
                action = target.getAttribute("cliqz-action"),
                duration = Date.now() - callout.getAttribute("show_ts");

            switch (action) {
                case "onboarding-start":
                    CliqzExtOnboarding._log("clicked on ok; remind user again in a bit");

                    CliqzExtOnboarding._handleCalloutClosed(callout, "seen", "ok");

                    callout.hidePopup();
                    win.CLIQZ.Core.popup.hidePopup();
                    win.CLIQZ.Core.openLink(destUrl, false);

                    break;

                case "onboarding-cancel":
                    CliqzExtOnboarding._log("clicked on cancel; don't remind user again");

                    CliqzExtOnboarding._handleCalloutClosed(callout, "discarded", "discard");

                    callout.hidePopup();
                    win.CLIQZ.Core.popup.hidePopup();
                    win.CLIQZ.Core.openLink(destUrl, false);

                    break;
            }
        }
    },

    _calloutCloseListener: function () {
        var callout = CliqzExtOnboarding._getCallout();

        if (CliqzExtOnboarding._handleCalloutClosed(callout, "seen", "blur")) {
            CliqzUtils.getWindow().CLIQZ.Core.openLink(destUrl, false);
        }
    },

    _dropdownCloseListener: function () {
        // FIXME: CliqzExtOnboarding is undefined after re-enabling extension
        var callout = CliqzExtOnboarding._getCallout();

        // close callout whenever dropdown closes
        if (callout.state == "open") {
            if (CliqzExtOnboarding._handleCalloutClosed(callout, "seen", "result")) {
                callout.hidePopup();
            }
        }
    },

    _urlbarKeydownListener: function (e) {    
        if (CliqzAutocomplete.selectAutocomplete) {
            if (currentAutocompleteUrlbar != CliqzAutocomplete.lastAutocompleteUrlbar) {
                // CliqzExtOnboarding._log("_urlbarKeydownListener: new autcompleted url, update");
                currentAutocompleteUrlbar = 
                    CliqzAutocomplete.lastAutocompleteUrlbar;
                currentAutocompleteMinSelectionStart = 
                    CliqzAutocomplete.lastAutocompleteSelectionStart;
            } else {
                // CliqzExtOnboarding._log("_urlbarKeydownListener: same autocompleted url, no update");
            }
        } else {
            if (e.keyCode == CliqzExtOnboarding.KEYCODE_ENTER) {
                var charsTyped = 
                    currentAutocompleteUrlbar.length - 
                    currentAutocompleteMinSelectionStart;
                if (charsTyped > 4) {
                    CliqzExtOnboarding._log("###### use autocomplete");
                } else {
                    CliqzExtOnboarding._log("_urlbarKeydownListener: not enough characters typed (" + charsTyped + ")");
                }
            }

            currentAutocompleteUrlbar = "";
            currentAutocompleteMinSelectionStart = 0;
        }
    },

    _handleCalloutClosed: function (callout, newState, reason) {
        // we already handled this close event
        var showTs = callout.getAttribute("show_ts");

        if (showTs == -1) {
            CliqzExtOnboarding._log("callout close event handled previously");
            return false;
        }

        var duration = Date.now() - callout.getAttribute("show_ts");
        // flag as "handled"
        callout.setAttribute("show_ts", -1);

        lastPrefs["state"] = newState;
        lastPrefs["show_count"]++;
        lastPrefs["max_show_duration"] =
            Math.max(lastPrefs["max_show_duration"], duration);

        CliqzUtils.setPref("extended_onboarding", JSON.stringify(
            { "same_result": lastPrefs }));

        CliqzExtOnboarding._telemetry("close", {
            duration: duration,
            reason: reason
        });

        return true;
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
