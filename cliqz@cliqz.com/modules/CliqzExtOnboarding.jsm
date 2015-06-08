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

var callout = undefined,
    // cache prefs
    lastPrefs = undefined,
    // cache destination URL
    destUrl = undefined;

var i = 0;

var CliqzExtOnboarding = {
    // maximum number of times we interrupt the user
    MAX_INTERRUPTS: 100, // 3
    // number of results required before we interrupt
    REQUIRED_RESULTS_COUNT: 0, // 5

    init: function () {
        CliqzExtOnboarding._createCallout();
        CliqzUtils.log("init callout " + callout);
        CliqzExtOnboarding._addCalloutListeners();
        CliqzExtOnboarding._addDropdownListeners();

        CliqzExtOnboarding._log("init: done");
    },

    unload: function () {
        CliqzExtOnboarding._removeCalloutListeners();
        CliqzExtOnboarding._removeDropdownListeners();
        CliqzExtOnboarding._destroyCallout();

        CliqzExtOnboarding._log("unload: done");     
    },

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
            this._log("not enough result clicks so far; not interrupting");
            return;
        }

        // ...seems we should interrupt the user
        prefs["result_count"] = 0;
        var win = CliqzUtils.getWindow(),
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

    // create callout element and attach to DOM
    _createCallout: function () {
        var win = CliqzUtils.getWindow(),            
            content = win.document.createElement('div'),
            parent = win.CLIQZ.Core.popup.parentElement;

        // file scope
        callout = win.document.createElement('panel');

        callout.className = "onboarding-container";
        content.className = "onboarding-callout";

        callout.setAttribute("id", "cliqzExtOnboardingCallout");
        callout.setAttribute("type", "arrow");
        callout.setAttribute("level", "top");

        // set HTML content
        CliqzExtOnboarding._initCalloutContent(content);

        callout.appendChild(content);
        parent.appendChild(callout);
        // callout.style.marginLeft ='0px';
        // callout.style.marginTop = '0px';
        // callout.setAttribute("position", "topleft topleft");
    },


    _initCalloutContent: function (contentElement) {
        // wait until template has been loaded
        if (!CliqzHandlebars.tplCache["onboarding-callout-extended"]) {
            CliqzUtils.setTimeout(function () {
                CliqzExtOnboarding._initCalloutContent(contentElement);
            }, 100);
            return;
        }

        contentElement.innerHTML = CliqzHandlebars.tplCache["onboarding-callout-extended"]({
            message: CliqzUtils.getLocalizedString("onCalloutGoogle"),
            options: [
                { label: 
                    CliqzUtils.getLocalizedString("onCalloutGoogleBtnOk"), 
                    action: 'onboarding-start', state: 'ok' },
                { label: 
                    CliqzUtils.getLocalizedString("onCalloutGoogleBtnCancel"), 
                    action: 'onboarding-cancel', state: 'cancel' }
            ],
            // FIXME: not shown
            cliqz_logo: 'chrome://cliqzres/content/skin/img/cliqz.svg'
        });
    },

    _destroyCallout: function () {
        callout && callout.parentNode.removeChild(callout);
    },

    // handle user clicks on ok and cancel buttons
    _addCalloutListeners: function () {
        callout.addEventListener("click", CliqzExtOnboarding._calloutClickListener);
    },

    _removeCalloutListeners: function () {
        callout.removeEventListener("click", CliqzExtOnboarding._calloutClickListener);
    },

    // FIXME: this might be attached/dettached from different window instances
    // close callout when dropdown closes (e.g., user clicking on result)
    _addDropdownListeners: function () {
        CliqzUtils.getWindow().CLIQZ.Core.popup.
            addEventListener("popuphidden", CliqzExtOnboarding._dropdownCloseListener);
    },

    _removeDropdownListeners: function () {
        CliqzUtils.getWindow().CLIQZ.Core.popup.
            removeEventListener("popuphidden", CliqzExtOnboarding._dropdownCloseListener);
    },

    _calloutClickListener: function (e) {
        var target = e.target;
        if (target && (e.button == 0 || e.button == 1)) {
            var action = target.getAttribute("cliqz-action"),
                duration = Date.now() - callout.getAttribute("show_ts"),
                win = CliqzUtils.getWindow();
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
        // close callout whenever dropdown closes
        if (callout.state == "open") {
            // we already handled this close event (user clicked on button)
            var showTs = CliqzExtOnboarding.callout.getAttribute("show_ts");
            if (showTs == -1) {
                CliqzExtOnboarding._log("callout close event handled previously");
                return;
            }

            var duration = Date.now() - CliqzExtOnboarding.callout.getAttribute("show_ts");

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
