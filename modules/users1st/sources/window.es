import { utils } from 'core/cliqz';

const adBlockKey = 'extensions.adblockplus.enabled',
      prefKey = 'adBlockBild', // 0 - ask, 1 - enable, 2 - disable
      BLOCK = false,
      ALLOW = true;

export default class {

  constructor(settings) {
    this.window = settings.window;
    this.gBrowser = this.window.gBrowser;

    if(!utils.hasPref(adBlockKey, '')) { return; }

    this.initialState = this.adBlockActive();
    this.state = true;
    this.warningDissmissed = false;


    this.userListener = {
      QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),
      onLocationChange: function(aBrowser, aWebProgress, aRequest, aLocation, aFlags) {
        this.checkUrl(aBrowser.currentURI.spec)
      }.bind(this)
    };

    this.userTabSelect = function (ev) {
      this.checkUrl(ev.target.linkedBrowser.contentWindow.location.href);
    }.bind(this);
  }

  init() {
    if(!this.initialState || !utils.hasPref(adBlockKey, '')) { return; }

    this.gBrowser.tabContainer.addEventListener("TabSelect", this.userTabSelect, false);
    this.gBrowser.addTabsProgressListener(this.userListener);
  }

  unload() {
    if(!this.initialState) { return; }

    this.gBrowser.tabContainer.removeEventListener("TabSelect", this.userTabSelect, false);
    this.gBrowser.removeTabsProgressListener(this.userListener);
  }

  createButtonItem(win) {
    if(!this.initialState) { return; }

    var doc = win.document,
        menu = doc.createElement('menu'),
        menupopup = doc.createElement('menupopup');

    menu.setAttribute('label', CliqzUtils.getLocalizedString('adblockbild'));

    var filter_levels = {
          '1': {
            name: CliqzUtils.getLocalizedString('always'),
            selected: false
          },
          '0': {
            name: CliqzUtils.getLocalizedString('always_ask'),
            selected: false
          },
          '2': {
            name: CliqzUtils.getLocalizedString('never'),
            selected: false
          }
    };

    filter_levels[CliqzUtils.getPref(prefKey, 0)].selected = true;

    for(var level in filter_levels) {
      var item = doc.createElement('menuitem');
      item.setAttribute('label', filter_levels[level].name);
      item.setAttribute('class', 'menuitem-iconic');

      if(filter_levels[level].selected){
        item.style.listStyleImage = 'url(chrome://cliqz/content/static/skin/checkmark.png)';
      }

      item.filter_level = parseInt(level);
      item.addEventListener('command', function(event) {
        CliqzUtils.setPref(prefKey, event.target.filter_level);
        this.changeAdBlockState(this.initialState);
        this.state = this.initialState;
        CliqzUtils.setTimeout(this.window.CLIQZ.Core.refreshButtons, 0);
      }.bind(this), false);

      menupopup.appendChild(item);
    };

    menu.appendChild(menupopup);
    return menu;
  }

  adBlockActive() {
    return CliqzUtils.getPref(adBlockKey, false, '');
  }

  changeAdBlockState(val) {
    return CliqzUtils.setPref(adBlockKey, val, '');
  }

  checkUrl(_url){
    var url = _url.split("://")[1],
        isBildUrl = url && url.indexOf('www.bild.de') == 0,
        newState = isBildUrl ? BLOCK : ALLOW,
        cliqzState = CliqzUtils.getPref(prefKey, 0),
        adBlockState = this.adBlockActive();

    //console.log('AdBlockBild -> state ',state,' new state:', newState,' prefState:', cliqzState,' adBlockState:', adBlockState)
    if(cliqzState == 2) { // disabled
      if(this.initialState != adBlockState){
        this.changeAdBlockState(this.initialState);
        this.state = this.initialState;
      }
      return;
    }

    //state can be changed in the in adp directly
    if(this.state != adBlockState){
      //adblockplus state was changed outside - disable CLIQZ mechanism
      this.unload();
    }

    if(this.state != newState) {
      if(cliqzState == 0){ // ask
        if(newState == BLOCK) CliqzUtils.setTimeout(this.showWarning.bind(this), 0);
      } else if(cliqzState == 1){ // enabled
        this.changeAdBlockState(newState);
        this.state = newState;
      }
    }
  }

  showWarning(){
    if(this.warningDissmissed) return;

    var box = this.gBrowser.getNotificationBox();
    if(!box.getNotificationWithValue('cliqz-popup')){
      var buttons = [
            {
                label: CliqzUtils.getLocalizedString('always'),
                callback: function(){
                  CliqzUtils.setPref(prefKey, 1);
                  this.gBrowser.reloadTab(this.gBrowser.selectedTab);
                }.bind(this)
            },
            {
                label: CliqzUtils.getLocalizedString('never'),
                callback: function(){
                  CliqzUtils.setPref(prefKey, 2);
                }
            }
          ];

      box.appendNotification(
        CliqzUtils.getLocalizedString('adblockbildWarning'),
        'cliqz-popup',
        '-',
        box.PRIORITY_WARNING_MEDIUM,
        buttons,
        function() {
          this.warningDissmissed = true;
          CliqzUtils.setTimeout(this.window.CLIQZ.Core.refreshButtons, 0);
        }.bind(this)
      );
    }
  }
}
