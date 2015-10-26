// COMPONENTS ARCHITECTURE

// allows users with adblockplus enabled to visit bild.de.
// it disables adblock plus only on this domain
(function(){
  var adblockbild = {},
      BLOCK = false,
      ALLOW = true,
      state = true,
      warningDissmissed = false,
      prefKey = 'adBlockBild', // 0 - ask, 1 - enable, 2 - disable
      adBlockKey = 'extensions.adblockplus.enabled';

  //if adblock is not present - return
  if(CLIQZ.Core.genericPrefs.getPrefType(adBlockKey) == 0) return;

  var initialState = adBlockActive(),
      userListener = {
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),
        onLocationChange: function(aBrowser, aWebProgress, aRequest, aLocation, aFlags) {
          checkUrl(aBrowser.currentURI.spec)
        }
      };

  function adBlockActive(){ return CLIQZ.Core.genericPrefs.getBoolPref(adBlockKey); }
  function changeAdBlockState(val){ return CLIQZ.Core.genericPrefs.setBoolPref(adBlockKey, val); }
  function userTabSelect(ev){ checkUrl(ev.target.linkedBrowser.contentWindow.location.href); }

  function checkUrl(_url){
    var url = _url.split("://")[1],
        isBildUrl = url && url.indexOf('www.bild.de') == 0,
        newState = isBildUrl ? BLOCK : ALLOW,
        cliqzState = CliqzUtils.getPref(prefKey, 0),
        adBlockState = adBlockActive();

    //console.log('AdBlockBild -> state ',state,' new state:', newState,' prefState:', cliqzState,' adBlockState:', adBlockState)
    if(cliqzState == 2) { // disabled
      if(initialState != adBlockState){
        changeAdBlockState(initialState);
        state = initialState;
      }
      return;
    }

    //state can be changed in the in adp directly
    if(state != adBlockState){
      //adblockplus state was changed outside - disable CLIQZ mechanism
      adblockbild.unload();
    }

    if(state != newState) {
      if(cliqzState == 0){ // ask
        if(newState == BLOCK) setTimeout(showWarning, 0);
      } else if(cliqzState == 1){ // enabled
        changeAdBlockState(newState);
        state = newState;
      }
    }
  }
  function showWarning(){
    if(warningDissmissed) return;
    var box = gBrowser.getNotificationBox();
    if(!box.getNotificationWithValue('cliqz-popup')){
      var buttons = [
            {
                label: CliqzUtils.getLocalizedString('always'),
                callback: function(){ CliqzUtils.setPref(prefKey, 1); gBrowser.reloadTab(gBrowser.selectedTab);  }
            },
            {
                label: CliqzUtils.getLocalizedString('never'),
                callback: function(){ CliqzUtils.setPref(prefKey, 2); }
            }
          ];

      box.appendNotification(
        CliqzUtils.getLocalizedString('adblockbildWarning'),
        'cliqz-popup',
        '-',
        box.PRIORITY_WARNING_MEDIUM,
        buttons,
        function(){ warningDissmissed = true; CliqzUtils.setTimeout(CLIQZ.Core.refreshButtons, 0); });
    }
  }

  adblockbild.button = function(win){
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
        item.style.listStyleImage = 'url(chrome://cliqzres/content/skin/checkmark.png)';
      }

      item.filter_level = parseInt(level);
      item.addEventListener('command', function(event) {
        CliqzUtils.setPref(prefKey, this.filter_level);
        changeAdBlockState(initialState);
        state = initialState;
        CliqzUtils.setTimeout(CLIQZ.Core.refreshButtons, 0);
      }, false);

      menupopup.appendChild(item);
    };
    menu.appendChild(menupopup);
    return menu;
  }
  adblockbild.init = function(){
    gBrowser.tabContainer.addEventListener("TabSelect", userTabSelect, false);
    gBrowser.addTabsProgressListener(userListener);
  }
  adblockbild.unload = function(){
    gBrowser.tabContainer.removeEventListener("TabSelect", userTabSelect, false);
    gBrowser.removeTabsProgressListener(userListener);
  }

  CLIQZ.COMPONENTS.push(adblockbild);
})();
