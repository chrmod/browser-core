var { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/Console.jsm")

function log() {
  var args = Array.prototype.slice.apply(arguments);
  args.unshift(content.window.location.toString());
  args.unshift('Frame Script');
  args.unshift('CLIQZ');

  console.log.apply(console, args);
}

function send(payload) {
  sendAsyncMessage('cliqz', {
    payload: payload,
  });
}

function LocationObserver(webProgress) {
  this.webProgress = webProgress;
}

LocationObserver.prototype.QueryInterface = XPCOMUtils.generateQI([
  'nsIWebProgressListener',
  'nsISupportsWeakReference'
]);

LocationObserver.prototype.start = function () {
  this.webProgress.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_LOCATION);
};

LocationObserver.prototype.stop = function () {
  this.webProgress.removeProgressListener(this);
};

LocationObserver.prototype.onLocationChange = function (aProgress, aRequest, aURI, aFlags) {
  if ( !aProgress.isTopLevel ) {
    return;
  }

  if ( !aRequest ) {
    return;
  }

  // only react to network related requests
  if ( ['http', 'https'].indexOf(aURI.scheme) === -1 ) {
    return;
  }

  var httpChannel = aRequest.QueryInterface(Ci.nsIHttpChannel);

  var referrer = (aProgress.DOMWindow && aProgress.DOMWindow.document.referrer)
    || (httpChannel.referrer && httpChannel.referrer.asciiSpec);

  var msg = {
    url: aURI.spec,
    referrer: referrer,
    isPrivate: aProgress.usePrivateBrowsing,
    flags: aFlags,
    isLoadingDocument: aProgress.isLoadingDocument,
    domWindowId: aProgress.DOMWindowID
  };

  //log('msg', JSON.stringify(msg))

  send({
    module: 'core',
    action: 'notifyLocationChange',
    args: [msg]
  });
};

//log('new')

var webProgress = this.docShell
  .QueryInterface(Ci.nsIInterfaceRequestor)
  .getInterface(Ci.nsIWebProgress);

var locationObserver = new LocationObserver(webProgress);
locationObserver.start();

// Handler unload
addMessageListener("cliqz:process-script", function ps(msg) {
  if (msg.data === "unload") {
    locationObserver.stop();
    removeMessageListener("cliqz:process-script", ps);
  }
});
