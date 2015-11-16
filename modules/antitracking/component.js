(function () {

window.CLIQZ.COMPONENTS.push({
  name: "antitracking",

  button() { /* not used */ },

  init() {
    this.popup = new CliqzPopupButton({
      name: this.name,
      actions: this.popupActions
    });
    this.popup.attach();
  },

  unload() {
    this.popup.destroy();
  },

  popupActions: {
    getPopupData(args, cb) {
      let url = window.top.getBrowser().selectedBrowser.contentWindow.location.href;
      cb({
        url
      });
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
