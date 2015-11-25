(function () {

function currentUrl() {
  return window.top.getBrowser().selectedBrowser.contentWindow.location.href;
}

window.CLIQZ.COMPONENTS.push({
  name: "antitracking",

  button() { /* not used */ },

  init() {
    this.popup = new CliqzPopupButton({
      name: this.name,
      actions: this.popupActions
    });
    this.popup.attach();

    this.listenToLocationChange();
  },

  listenToLocationChange() {
    CliqzEvents.sub("core.location_change", function (ev) {
      clearInterval(this.interval);

      this.popup.setBadge();
      var counter = 8;

      this.interval = setInterval(function () {

        var info = CliqzAttrack.getCurrentTabBlockingInfo();
        if(info.error) { return; } // anti tracking is turn off
        this.popup.setBadge(info.cookies.blocked);

        counter -= 1;
        if (counter === 0) {
          clearInterval(this.interval);
        }
      }.bind(this), 2000);
    }.bind(this));
  },

  unload() {
    this.popup.destroy();
    clearInterval(this.interval);
  },

  popupActions: {
    getPopupData(args, cb) {
      var info = CliqzAttrack.getCurrentTabBlockingInfo();
      if (info.error) {
        info = {
          cookies: {
            blocked: 0
          },
          requests: {
            unsafe: 0
          }
        };
      }

      cb({
        url: currentUrl(),
        cookiesCount: info.cookies.blocked,
        requestsCount: info.requests.unsafe,
        enabled: CliqzUtils.getPref("antiTrackTest"),
      });
    },

    toggleAttrack(args, cb) {
      if ( CliqzUtils.getPref("antiTrackTest") ) {
        CliqzAttrack.disableModule();
      } else {
        CliqzAttrack.enableModule();
      }
      cb();
    }
  }

});

// stolen mostly from: https://github.com/gorhill/uBlock/blob/master/platform/firefox/vapi-background.js#L2863
function CliqzPopupButton(options) {
  this.CustomizableUI = Components.utils.import('resource:///modules/CustomizableUI.jsm', null).CustomizableUI;

  this.name = options.name;
  this.actions = options.actions;

  var tbb = this.tbb = {
    id: this.name+'-button',
    type: 'view',
    viewId: this.name+'-panel',
    label: this.name,
    tooltiptext: this.name,
    tabs: {/*tabId: {badge: 0, img: boolean}*/},
    init: null,
    codePath: ''
  };

  function populatePanel(doc, panel) {
    panel.setAttribute('id', tbb.viewId);

    var iframe = doc.createElement('iframe');
    iframe.setAttribute('type', 'content');
    iframe.setAttribute('src', modulePath('antitracking', 'popup.html'));

    function toPx(pixels) {
      return pixels.toString() + 'px';
    }

    function onPopupReady() {
      var body = iframe.contentDocument.body;
      var clientHeight = body.scrollHeight;

      iframe.style.height = toPx(clientHeight);
      panel.style.height = toPx(clientHeight + panel.boxObject.height - panel.clientHeight );
    }

    iframe.addEventListener('load', onPopupReady, true);
    panel.appendChild(iframe);
  }

  tbb.codePath = 'australis';
  tbb.CustomizableUI = this.CustomizableUI;
  tbb.defaultArea = this.CustomizableUI.AREA_NAVBAR;

  var styleURI = null;

  tbb.onBeforeCreated = function(doc) {
    var panel = doc.createElement('panelview');

    populatePanel(doc, panel);

    doc.getElementById('PanelUI-multiView').appendChild(panel);

    doc.defaultView.QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindowUtils)
      .loadSheet(styleURI, 1);
  };

  var style = [
    '#' + tbb.id + '.off {',
      'list-style-image: url(',
        'chrome://cliqzres/content/skin/cliqz_btn.svg',
      ');',
    '}',
    '#' + tbb.id + ' {',
      'list-style-image: url(',
        'chrome://cliqzres/content/skin/cliqz_btn.svg',
      ');',
    '}',
    '#' + tbb.viewId + ',',
    '#' + tbb.viewId + ' > iframe {',
      'width: 400px;',
      'overflow: hidden !important;',
    '}'
  ];

  styleURI = Services.io.newURI(
      'data:text/css,' + encodeURIComponent(style.join('')),
      null,
      null
  );

  tbb.closePopup = function (tabBrowser) {
    this.CustomizableUI.hidePanelForNode(
        gBrowser.ownerDocument.getElementById(tbb.viewId)
    );
  }.bind(this);
}

CliqzPopupButton.prototype.setBadge = function (badgeText) {
  var button = document.getElementById(this.tbb.id);

  if ( badgeText ) {
    button.setAttribute('badge', String(badgeText));
  } else {
    button.setAttribute('badge', '');
  }


  if ( button.classList.contains('badged-button') ) {
    return;
  }

  button.classList.add('badged-button');

  setTimeout(function () {
    var badge = button.ownerDocument.getAnonymousElementByAttribute(
      button,
      'class',
      'toolbarbutton-badge'
    );

    badge.style.cssText = 'background-color: #666; color: #fff;';
  }, 250);
};

CliqzPopupButton.prototype.attach = function () {
  CustomizableUI.createWidget(this.tbb);
  this.setupCommunicationChannel();
};

CliqzPopupButton.prototype.destroy = function () {};

CliqzPopupButton.prototype.setupCommunicationChannel = function () {
  Components.utils.import('chrome://cliqzmodules/content/CliqzEvents.jsm');

  var channelName = this.name,
      actions = this.actions;

  function popupMessageHandler(msg) {
    var functionName = msg.message.functionName,
        functionArgs = msg.message.args,
        handler = actions[functionName];

    function callback(res) {
      CliqzEvents.pub(channelName+"-background", {
        id: msg.id,
        message: res
      });
    };

    if (!handler) { return; }

    handler(functionArgs, callback);
  };

  CliqzEvents.sub(channelName+"-popup", popupMessageHandler);
}

}());
