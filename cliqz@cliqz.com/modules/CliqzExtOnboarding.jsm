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

var prefs = { },
    // cache destination URL
    destUrl = undefined;


// cache autocomplete state
var currentAutocompleteUrlbar = "",
    currentAutocompleteMinSelectionStart = 0;

var CliqzExtOnboarding = {
    // maximum number of times we interrupt the user
    SAME_RESULT_MAX_INTERRUPTS: 3, // 3
    TYPED_URL_MAX_INTERRUPTS: 3, // 3
    // number of results required before we interrupt
    SAME_RESULT_REQUIRED_RESULTS_COUNT: 5, // 5
    TYPED_URL_REQUIRED_RESULTS_COUNT: 3, // 3
    TYPED_URL_MIN_CHARS_TYPED: 4,
    KEYCODE_ENTER: 13,
    CALLOUT_DOM_ID: "cliqzExtOnboardingCallout",

    // will be checked on module load
    _isFirefoxVersionSupported: false,
    _calloutParsedContent: { },

    // called for each new window
    init: function (win) {
        CliqzExtOnboarding._log("init: initializing");

        CliqzExtOnboarding._checkFirefoxVersionRequirements();

        var callout = CliqzExtOnboarding._createCallout(win);
        CliqzExtOnboarding._addCalloutListeners(callout);
        CliqzExtOnboarding._addDropdownListeners(win);

        if (CliqzExtOnboarding._isFirefoxVersionSupported &&
            CliqzUtils.getPref("extended_onboarding_typed_url", false)) {
            CliqzExtOnboarding._addUrlbarKeydownListener(win);
        }

        win.gBrowser.addProgressListener(CliqzExtOnboarding.progressListener);

        CliqzExtOnboarding._loadPrefs();
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
        win.gBrowser.removeProgressListener(CliqzExtOnboarding.progressListener);

        CliqzExtOnboarding._log("unload: done");
    },

    onSameResult: function (request, resultIndex, destinationUrl) {
        var isActive = CliqzUtils.getPref("extended_onboarding_same_result", false);
        if (!isActive) {
            CliqzExtOnboarding._log("onSameResult: same result AB test not active; aborting");
            return;
        }

        if (!CliqzExtOnboarding._isFirefoxVersionSupported) {
            CliqzExtOnboarding._log("onSameResult: Firefox version not supported");
            return;
        }      

        if (prefs["same_result"]) {
            // for those users who were already in the AB test when
            // "sub_group" was introduced
            if (!prefs["same_result"].hasOwnProperty("sub_group")) {
                prefs["same_result"]["sub_group"] = "na";                
            }
        } else {
            prefs["same_result"] = {                
                "state": "seen",
                "result_count": 0,
                "show_count": 0,
                "max_show_duration": 0,
                "sub_group": "tbd" // set only when we would show the message for the first time
            };
            CliqzExtOnboarding._log("creating same results prefs");
        }
        CliqzUtils.setPref("extended_onboarding", JSON.stringify(prefs));

        // checking for reasons _not_ to interrupt the users...
        if (prefs["same_result"]["state"] == "discarded") {
            CliqzExtOnboarding._log("onSameResult: user had discarded before; not interrupting");
            return;
        } else if (prefs["same_result"]["show_count"] >= CliqzExtOnboarding.SAME_RESULT_MAX_INTERRUPTS) {
            CliqzExtOnboarding._log("onSameResult: max. show reached; not interrupting");
            return;
        } else if (prefs["same_result"]["result_count"] < CliqzExtOnboarding.SAME_RESULT_REQUIRED_RESULTS_COUNT) {
            prefs["same_result"]["result_count"]++;
            CliqzUtils.setPref("extended_onboarding", JSON.stringify(prefs));
            CliqzExtOnboarding._log("onSameResult: not enough result clicks so far; not interrupting");
            return;
        }

        // decide which subgroup we are going to be in
        if (prefs["same_result"]["sub_group"] == "tbd") {            
            prefs["same_result"]["sub_group"] = (Math.random(1) < .5) ? "show" : "no_show";
            CliqzUtils.setPref("extended_onboarding", JSON.stringify(prefs));
            CliqzExtOnboarding._log("decided for subgroup " + prefs["same_result"]["sub_group"]);            
        }

        // ...seems we should interrupt the user
        prefs["same_result"]["result_count"] = 0;
        CliqzUtils.setPref("extended_onboarding", JSON.stringify(prefs));

        var win = CliqzUtils.getWindow(),
            callout = CliqzExtOnboarding._getCallout(win),
            anchor = win.CLIQZ.Core.popup.cliqzBox.resultsBox.children[resultIndex];

        if (anchor) {
            if (anchor.offsetTop < 300) {
                if (prefs["same_result"]["sub_group"] == "no_show") {
                    CliqzExtOnboarding._log("user is in sub_group no show: do nothing");
                    return;
                }
                destUrl = destinationUrl;

                win.CLIQZ.Core.popup._openAutocompletePopup(
                    win.CLIQZ.Core.urlbar, win.CLIQZ.Core.urlbar);
                CliqzExtOnboarding._setCalloutContent("same_result");
                callout.openPopup(anchor, "end_before", -5, 0);
                callout.setAttribute("show_ts", Date.now());
                callout.setAttribute("msg_type", "same_result");

                request.cancel("CLIQZ_INTERRUPT");
                CliqzExtOnboarding._log("interrupted");
                CliqzExtOnboarding._telemetry("same_result", "show", {
                    count: prefs["same_result"]["show_count"],
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

    progressListener: {
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),
        onLocationChange: function(aProgress, aRequest, aURI) {
            CliqzExtOnboarding._log("### onLocationChange");
        },
        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
        }
    },

    _loadPrefs: function () {
        try {
            prefs = 
                JSON.parse(CliqzUtils.getPref("extended_onboarding"));
        } catch (e) { }
    },

    _checkFirefoxVersionRequirements: function () {
        try {
            var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                .getService(Components.interfaces.nsIXULAppInfo);
            var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                .getService(Components.interfaces.nsIVersionComparator);

            // running under Firefox 36.0 or later
            if(versionChecker.compare(appInfo.version, "36.0") < 0) {
                CliqzExtOnboarding._log("_checkFirefoxVersionRequirements: requires Firefox 36.0 or higher");                
            } else {
                CliqzExtOnboarding._isFirefoxVersionSupported = true;
            }
        } catch (e) {
            CliqzExtOnboarding._log("_checkFirefoxVersionRequirements: unable to check Firefox version");
            return;
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

        CliqzExtOnboarding._calloutParsedContent["same_result"] = CliqzHandlebars.tplCache["onboarding-callout-extended"]({
            message: CliqzUtils.getLocalizedString("onCalloutSameResult"),
            options: [
                { label:
                    CliqzUtils.getLocalizedString("onCalloutSameResultBtnOk"),
                    action: "onboarding-start", state: "ok" },
                { label:
                    CliqzUtils.getLocalizedString("onCalloutSameResultBtnCancel"),
                    action: "onboarding-cancel", state: "cancel" }
            ],
            cliqz_logo: "chrome://cliqzres/content/skin/img/cliqz.svg"
        });

        CliqzExtOnboarding._calloutParsedContent["typed_url"] = CliqzHandlebars.tplCache["onboarding-callout-extended"]({
            message: CliqzUtils.getLocalizedString("onCalloutTypedUrl"),
            options: [
                { label:
                    CliqzUtils.getLocalizedString("onCalloutTypedUrlBtnOk"),
                    action: "onboarding-start", state: "ok" },
                { label:
                    CliqzUtils.getLocalizedString("onCalloutTypedUrlBtnCancel"),
                    action: "onboarding-cancel", state: "cancel" }
            ],
            cliqz_logo: "chrome://cliqzres/content/skin/img/cliqz.svg"
        });

        CliqzExtOnboarding._log("_initCalloutContent: template parsed");
    },

    _setCalloutContent: function (messageType) {
        var callout = CliqzExtOnboarding._getCallout();
        callout.firstChild.innerHTML = 
            CliqzExtOnboarding._calloutParsedContent[messageType];
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
                callout = CliqzExtOnboarding._getCallout(win),
                action = target.getAttribute("cliqz-action"),
                duration = Date.now() - callout.getAttribute("show_ts");

            CliqzExtOnboarding._log("_calloutClickListener: message type is " +
                callout.getAttribute("msg_type"));
            switch (callout.getAttribute("msg_type")) {
                case "same_result":
                    switch (action) {
                        case "onboarding-start":
                            CliqzExtOnboarding._log("clicked on ok; remind user again in a bit");
                            CliqzExtOnboarding._handleCalloutClosed(callout, "seen", "ok");

                            win.CLIQZ.Core.popup.hidePopup();
                            win.CLIQZ.Core.openLink(destUrl, false);

                            break;

                        case "onboarding-cancel":
                            CliqzExtOnboarding._log("clicked on cancel; don't remind user again");
                            CliqzExtOnboarding._handleCalloutClosed(callout, "discarded", "discard");
                            
                            win.CLIQZ.Core.popup.hidePopup();
                            win.CLIQZ.Core.openLink(destUrl, false);

                            break;
                    }
                    break;
                case "typed_url":
                    switch (action) {
                        case "onboarding-start":
                            CliqzExtOnboarding._log("clicked on ok; remind user again in a bit");
                            CliqzExtOnboarding._handleCalloutClosed(callout, "seen", "ok");
                            break;
                        case "onboarding-cancel":
                            CliqzExtOnboarding._log("clicked on cancel; don't remind user again");
                            CliqzExtOnboarding._handleCalloutClosed(callout, "discarded", "discard");
                            break;
                    break;
                }
            }
            callout.hidePopup();
        }
    },

    _calloutCloseListener: function () {
        var callout = CliqzExtOnboarding._getCallout();

        switch (callout.getAttribute("msg_type")) {
            case "same_result":
                if (CliqzExtOnboarding._handleCalloutClosed(callout, "seen", "blur")) {
                    CliqzUtils.getWindow().CLIQZ.Core.openLink(destUrl, false);
                }
                break;
            case "typed_url":
                CliqzExtOnboarding._handleCalloutClosed(callout, "seen", "blur")
                break;
        }
    },

    _dropdownCloseListener: function () {
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
            var charsTyped = 
                currentAutocompleteUrlbar.length - 
                currentAutocompleteMinSelectionStart;
            currentAutocompleteUrlbar = "";
            currentAutocompleteMinSelectionStart = 0;
            if (e.keyCode == CliqzExtOnboarding.KEYCODE_ENTER) {                
                if (charsTyped > CliqzExtOnboarding.TYPED_URL_MIN_CHARS_TYPED) {                    
                    // getting current state from user prefs                    
                    if (!prefs["typed_url"]) {
                        prefs["typed_url"] = {
                            "state": "seen",
                            "show_count": 0,
                            "result_count": 0,
                            "max_show_duration": 0,
                            "sub_group": "tbd" // set only when we would show the message for the first time
                        };
                        CliqzExtOnboarding._log("creating prefs for typed_url");
                    }
                    CliqzUtils.setPref("extended_onboarding", JSON.stringify(prefs));

                    // checking for reasons _not_ to interrupt the users...
                    if (prefs["typed_url"]["state"] == "discarded") {
                        CliqzExtOnboarding._log("typed url: user had discarded before; not interrupting");
                        return;
                    } else if (prefs["typed_url"]["show_count"] >= CliqzExtOnboarding.TYPED_URL_MAX_INTERRUPTS) {
                        CliqzExtOnboarding._log("typed url: max. show reached; not interrupting");
                        return;
                    } else if (prefs["typed_url"]["result_count"] < CliqzExtOnboarding.TYPED_URL_REQUIRED_RESULTS_COUNT) {
                        prefs["typed_url"]["result_count"]++;
                        CliqzUtils.setPref("extended_onboarding", JSON.stringify(prefs));
                        CliqzExtOnboarding._log("typed url: not enough typed url instances; not interrupting");
                        return;
                    }

                    // decide which subgroup we are going to be in
                    if (prefs["typed_url"]["sub_group"] == "tbd") {            
                        prefs["typed_url"]["sub_group"] = (Math.random(1) < .5) ? "show" : "no_show";
                        CliqzExtOnboarding._log("typed url: decided for subgroup " + prefs["typed_url"]["sub_group"]);
                        CliqzUtils.setPref("extended_onboarding", JSON.stringify(prefs));
                    }
                    
                    if (prefs["typed_url"]["sub_group"] == "no_show") {
                        CliqzExtOnboarding._log("typed url: user is in sub_group no show: do nothing");
                        return;
                    }

                    prefs["typed_url"]["result_count"] = 0;
                    CliqzUtils.setPref("extended_onboarding", JSON.stringify(prefs));

                    CliqzExtOnboarding._log("typed url: showing message");
                    CliqzExtOnboarding._telemetry("typed_url", "show", {
                        count: prefs["typed_url"]["show_count"]
                    });

                    var callout = CliqzExtOnboarding._getCallout();
                    CliqzExtOnboarding._setCalloutContent("typed_url");
                    callout.openPopup(CliqzUtils.getWindow().CLIQZ.Core.urlbar, "after_start", 20, -5);
                    callout.setAttribute("show_ts", Date.now());
                    callout.setAttribute("msg_type", "typed_url");
                } else {
                    CliqzExtOnboarding._log("_urlbarKeydownListener: not enough characters typed (" + charsTyped + ")");
                }
            }
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

        switch (callout.getAttribute("msg_type")) {
            case "same_result":
                prefs["same_result"]["state"] = newState;
                prefs["same_result"]["show_count"]++;
                prefs["same_result"]["max_show_duration"] =
                    Math.max(prefs["same_result"]["max_show_duration"], duration);

                CliqzUtils.setPref("extended_onboarding", JSON.stringify(prefs));

                CliqzExtOnboarding._telemetry("same_result", "close", {
                    duration: duration,
                    reason: reason
                });

                return true;
            case "typed_url":
                prefs["typed_url"]["state"] = newState;
                prefs["typed_url"]["show_count"]++;
                prefs["typed_url"]["max_show_duration"] =
                    Math.max(prefs["typed_url"]["max_show_duration"], duration);

                CliqzUtils.setPref("extended_onboarding", JSON.stringify(prefs));

                CliqzExtOnboarding._telemetry("typed_url", "close", {
                    duration: duration,
                    reason: reason
                });
                return true;
        }
    },

	_log: function (msg) {
		CliqzUtils.log(msg, 'CliqzExtOnboarding');
	},

	_telemetry: function (component, action, data) {
        var signal = {
            type: 'extended_onboarding',
            // make configurable once there are more components
            component: component,
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
