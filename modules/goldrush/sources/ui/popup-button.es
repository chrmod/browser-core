import { utils } from 'core/cliqz';

function log(s){
  utils.log(s, 'GOLDRUSH - POPUP');
}

export function CliqzPopupButton(options) {
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

    log('populatePanel called');

    var iframe = doc.createElement('iframe');
    iframe.setAttribute('type', 'content');
    iframe.setAttribute('src', 'chrome://cliqz/content/goldrush/popup.html');
    panel.appendChild(iframe);

    function toPx(pixels) {
      return pixels.toString() + 'px';
    }

    function onPopupReady() {
      if (!iframe || !iframe.contentDocument) { return; }

      var body = iframe.contentDocument.body;
      var clientHeight = body.scrollHeight;

      iframe.style.height = toPx(clientHeight);
      panel.style.height = toPx(clientHeight + panel.boxObject.height - panel.clientHeight );
      log('onPopupReady called');
    }
    iframe.addEventListener('load', onPopupReady, true);
  }

  tbb.codePath = 'australis';
  tbb.CustomizableUI = this.CustomizableUI;
  tbb.defaultArea = this.CustomizableUI.AREA_NAVBAR;

  var styleURI = null;

  tbb.onBeforeCreated = function(doc) {
    var panel = doc.createElement('panelview');
    log('onBeforeCreated called');

    populatePanel(doc, panel);

    doc.getElementById('PanelUI-multiView').appendChild(panel);

    doc.defaultView.QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindowUtils)
      .loadSheet(styleURI, 1);
  };

  tbb.onClick = function(evt) {
    log('onClick event!: ' + evt);
  };

  var style = [
    '#' + tbb.id + '.off {',
      'list-style-image: url(',
        'chrome://cliqz/content/static/skin/images/goldrush/goldrush-off.png',
      ');',
    '}',
    '#' + tbb.id + ' {',
      'list-style-image: url(',
        'chrome://cliqz/content/static/skin/images/goldrush/goldrush-on.png',
      ');',
    '}',
    '#' + tbb.viewId + ',',
    '#' + tbb.viewId + ' > iframe {',
      'width: 400px;',
      'height: hidden !important;',
    '}'
  ];

  styleURI = Services.io.newURI(
      'data:text/css,' + encodeURIComponent(style.join('')),
      null,
      null
  );

  tbb.closePopup = function (tabBrowser) {
    log('closePopup called');
    this.CustomizableUI.hidePanelForNode(
        utils.getWindow().gBrowser.ownerDocument.getElementById(tbb.viewId)
    );
  }.bind(this);
}


// TODO_QUESTION: will show the popup to the user (like if he clicked it).
//
CliqzPopupButton.prototype.showPopUp = function () {
  log('showPopUp called');

};

// TODO_QUESTION: this

CliqzPopupButton.prototype.updateView = function (win, clientHeight) {
  log('updateView called');
  var panel = win.document.getElementById(this.tbb.viewId);
  var iframe = panel.querySelector('iframe');

    function toPx(pixels) {
      return pixels.toString() + 'px';
    }

    function onPopupReady() {
      if (!iframe || !iframe.contentDocument) { return; }

      iframe.style.height = toPx(clientHeight);
      panel.style.height = toPx(clientHeight + panel.boxObject.height - panel.clientHeight );
    }

  onPopupReady();
};

CliqzPopupButton.prototype.updateState = function (win, turnOn) {
  if (!win) {
    return;
  }

  var button = win.document.getElementById(this.tbb.id);

  if (turnOn) {
    button.classList.remove('off');
  } else {
    button.classList.add('off');
  }
  log('updateView called');
};

CliqzPopupButton.prototype.setBadge = function (win, badgeText) {
  var button = win.document.getElementById(this.tbb.id);
  log('setBadge called: ' + badgeText);

  if ( badgeText ) {
    button.setAttribute('badge', String(badgeText));
  } else {
    button.setAttribute('badge', '');
  }


  if ( !button.classList.contains('badged-button') ) {
    button.classList.add('badged-button');
  }

  CliqzUtils.setTimeout(function () {
    var badge = button.ownerDocument.getAnonymousElementByAttribute(
      button,
      'class',
      'toolbarbutton-badge'
    );

    // when window is too small to display all icons, the anti-tracking badge
    // may be hidden behind a '>>' button. In this case, badge will be null.
    if(badge) {
      badge.style.cssText = 'background-color: #666; color: #fff;';
    }
  }, 250);
};

CliqzPopupButton.prototype.attach = function () {
  this.CustomizableUI.createWidget(this.tbb);
  this.setupCommunicationChannel();
};

CliqzPopupButton.prototype.destroy = function () {
  this.CustomizableUI.destroyWidget(this.tbb.id);
};

CliqzPopupButton.prototype.setupCommunicationChannel = function () {
  Components.utils.import('chrome://cliqzmodules/content/CliqzEvents.jsm');

  var channelName = this.name,
      actions = this.actions;

  function popupMessageHandler(msg) {
    log('popupMessageHandler called');
    var functionName = msg.message.functionName,
        functionArgs = msg.message.args,
        handler = actions[functionName];

    function callback(res) {
      log('callback called: ' + res);
      CliqzEvents.pub(channelName+'-background', {
        id: msg.id,
        message: res
      });
    }

    if (!handler) { return; }

    handler(functionArgs, callback);
  }

  CliqzEvents.sub(channelName+'-popup', popupMessageHandler);
};
