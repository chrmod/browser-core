import background from "core/base/background";
import utils from "core/utils";

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, manager: Cm } =
    Components;

const StringInputStream = CC(
  '@mozilla.org/io/string-input-stream;1',
  'nsIStringInputStream',
  'setData');
const InputStreamChannel = Cc["@mozilla.org/network/input-stream-channel;1"];
const securityManager = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(
    Ci.nsIScriptSecurityManager);

var CLIQZ_ONBOARDING = "about:onboarding",
    CLIQZ_ONBOARDING_URL = "chrome://cliqz/content/onboarding-v2/index.html"

Cm.QueryInterface(Ci.nsIComponentRegistrar);

function AboutURL() {}
AboutURL.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
  classDescription: CLIQZ_ONBOARDING,
  classID: Components.ID("{be8a8710-7611-11e6-bdf4-0800200c9a66}"),
  contractID: "@mozilla.org/network/protocol/about;1?what=onboarding",

  newChannel: function(uri) {
    var src = CLIQZ_ONBOARDING_URL;
    var html =  [
        '<!DOCTYPE html><html><head><title>CLIQZ</title><meta charset="UTF-8">',
        '<style>* {margin:0;padding:0;width:100%;height:100%;overflow:hidden;border: 0}</style>',
        `</head><body><iframe src="${src}">`,
        '</iframe></body></html>'
    ].join("");

    let channel = InputStreamChannel.createInstance(Ci.nsIInputStreamChannel).
        QueryInterface(Ci.nsIChannel);
    channel.setURI(uri);
    channel.originalURI = uri;
    channel.contentStream = new StringInputStream(html, html.length);
    channel.owner = securityManager.getSystemPrincipal();

    return channel;
  },

  getURIFlags: function(uri) {
    return Ci.nsIAboutModule.ALLOW_SCRIPT;
  }
};

const AboutURLFactory =
    XPCOMUtils.generateNSGetFactory([AboutURL])(AboutURL.prototype.classID);

/**
  @namespace <namespace>
  @class Background
 */
export default background({

  enabled() {
    return true;
  },

  /**
    @method init
    @param settings
  */
  init(settings) {
    Cm.registerFactory(
      AboutURL.prototype.classID,
      AboutURL.prototype.classDescription,
      AboutURL.prototype.contractID,
      AboutURLFactory
    );
  },

  unload() {
    Cm.unregisterFactory(AboutURL.prototype.classID, AboutURLFactory);
  },

  beforeBrowserShutdown() {

  },

  events: {

  },

  actions: {
    moveToStep(step) {
      utils.setPref('cliqz-onboarding-v2-step', step);
    },

    step1() {
      utils.callWindowAction(
        utils.getWindow(),
        'core',
        'addClassToWindow',
        ['cqz-onboarding', 'cqz-step1']
      );
    },

    step2() {
      utils.callWindowAction(
        utils.getWindow(),
        'core',
        'addClassToWindow',
        ['cqz-step2']
      );

      utils.setPref('cliqz-onboarding-v2-step', 2);
      setTimeout(function() {
        utils.callWindowAction(
          utils.getWindow(),
          'control-center',
          'openPopUp'
        );
      }, 400);

      setTimeout(function() {
        utils.callAction(
          'control-center',
          'setBadge',
          [17]
        );
      }, 1000);
    },

    step3() {
      utils.callWindowAction(
        utils.getWindow(),
        'core',
        'removeClassFromWindow',
        ['cqz-step1', 'cqz-step2']
      );

      utils.setPref('cliqz-onboarding-v2-step', 3);

      utils.callAction(
        'control-center',
        'setBadge',
        [0]
      );

      this.actions._focusUrlbar();

      utils.callWindowAction(
        utils.getWindow(),
        'control-center',
        'updateState',
        ['active']
      );
    },

    _focusUrlbar() {
      var urlBar = utils.getWindow().CLIQZ.Core.urlbar;
      urlBar.focus();
      urlBar.mInputField.focus();
    }

  }
});
