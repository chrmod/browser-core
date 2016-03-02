'use strict';

// todo: WRITE UNIT TEST

const { classes: Cc, interfaces: Ci, utils: Cu, manager: Cm } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

import { utils } from 'core/cliqz';
import Signals from 'privacy-dashboard/signals';

Cm.QueryInterface(Ci.nsIComponentRegistrar);
function AboutURLPrivacy() {}
var AboutURLFactoryPrivacy;

var PrivacyRep = {
  initialized: false,
  openingStreamCount: 0,

  onExtensionStart: function () {
    Signals.init();

    if (PrivacyRep.initialized === false) {
      AboutURLPrivacy.prototype = {
        QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
        classDescription: 'about:cliqzloyalty',
        classID: Components.ID('{bbab0a50-7988-11e5-a837-0800200c9a66}'),
        contractID: '@mozilla.org/network/protocol/about;1?what=cliqzloyalty',

        newChannel: function (uri) {
          var ioService = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
          var html = ['data:text/html,<!DOCTYPE html><html><head><meta charset=\'UTF-8\'>',
            '<style>* {margin:0;padding:0;width:100%;height:100%;overflow:hidden;border: 0}</style>',
            '</head><body><iframe src=\'chrome://cliqz/content/privacy-dashboard/index.html\'></iframe></body></html>'].join('');

          var securityManager = Cc['@mozilla.org/scriptsecuritymanager;1'].getService(Ci.nsIScriptSecurityManager);
          var channel = ioService.newChannel(html, null, null);
          channel.originalURI = uri;
          channel.owner = securityManager.getSystemPrincipal();

          return channel;
        },

        getURIFlags: function (uri) {
          return Ci.nsIAboutModule.ALLOW_SCRIPT;
        }
      };

      AboutURLFactoryPrivacy = XPCOMUtils.generateNSGetFactory([AboutURLPrivacy])(AboutURLPrivacy.prototype.classID);

      Cm.registerFactory(
        AboutURLPrivacy.prototype.classID,
        AboutURLPrivacy.prototype.classDescription,
        AboutURLPrivacy.prototype.contractID,
        AboutURLFactoryPrivacy
      );
    }

    PrivacyRep.initialized = true;
  },

  unload: function(){
    // only called when disable the extension
    if(!PrivacyRep.initialized) {
      return;
    }
    Cm.unregisterFactory(AboutURLPrivacy.prototype.classID, AboutURLFactoryPrivacy);
  },

  registerStream: function () {
    PrivacyRep.openingStreamCount += 1;
    Signals.setStreaming(true);
  },

  unregisterStream: function () {
    PrivacyRep.openingStreamCount -= 1;
    if (PrivacyRep.openingStreamCount <= 0) {
      Signals.setStreaming(false);
      PrivacyRep.openingStreamCount = 0;
    }
  },

  getCurrentData: function () {
    return Signals.getSignalsToDashboard();
  }
};

export default PrivacyRep;
