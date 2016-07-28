import { utils } from "core/cliqz";

export default class {
  constructor(settings) {

  }

  init() {
    utils.callAction("geolocation", "updateGeoLocation", []);
  }

  unload() {

  }

  createButtonItem(win) {
    var doc = win.document,
      menu = doc.createElement('menu'),
      menupopup = doc.createElement('menupopup');

    menu.setAttribute('label', utils.getLocalizedString('share_location'));

    var filter_levels = this.getLocationPermState();

    for(var level in filter_levels) {
      var item = doc.createElement('menuitem');
      item.setAttribute('label', filter_levels[level].name);
      item.setAttribute('class', 'menuitem-iconic');


      if(filter_levels[level].selected){
        item.style.listStyleImage = 'url(' + utils.SKIN_PATH + 'checkmark.png)';
      }

      item.filter_level = new String(level);
      item.addEventListener('command', function(event) {
        utils.callAction(
          "geolocation",
          "setLocationPermission",
          [win, this.filter_level.toString()]
        );
        utils.telemetry({
          type: 'activity',
          action: 'cliqz_menu_button',
          button_name: 'location_change_' + this.filter_level
        });
      }, false);

      menupopup.appendChild(item);
    };

    var learnMore = win.CLIQZ.Core.createSimpleBtn(
      doc,
      utils.getLocalizedString('learnMore'),
      function(){
        var lang = utils.getLanguage(win) == 'de' ? '' : 'en/';
        utils.openTabInWindow(win, 'https://cliqz.com/' + lang + 'privacy');
      },
      'location_learn_more'
    );
    learnMore.setAttribute('class', 'menuitem-iconic');
    menupopup.appendChild(doc.createElement('menuseparator'));
    menupopup.appendChild(learnMore);

    menu.appendChild(menupopup);
    return menu;
  }

  getLocationPermState(){
    var data = {
      'yes': {
        name: utils.getLocalizedString('always'),
        selected: false
      },
      'ask': {
        name: utils.getLocalizedString('always_ask'),
        selected: false
      },
      'no': {
        name: utils.getLocalizedString('never'),
        selected: false
      }
    };

    data[utils.getPref('share_location', 'ask')].selected = true;

    return data;
  }
}
