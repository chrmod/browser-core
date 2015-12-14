import CliqzUnblock from 'unblock/main';

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    CliqzUnblock.initWindow(this.window);
  }

  unload() {
    CliqzUnblock.unloadWindow(this.window);
  }

  createButtonItem(win) {
    var doc = win.document,
      menu = doc.createElement('menu'),
      menupopup = doc.createElement('menupopup');

    CliqzUtils.log("button", "Xxx");

    menu.setAttribute('label', 'Unblock content');

    var filter_levels = {
        'always': {
          name: CliqzUtils.getLocalizedString('always'),
          selected: false
        },
        'ask': {
          name: CliqzUtils.getLocalizedString('always_ask'),
          selected: false
        },
        'never': {
          name: CliqzUtils.getLocalizedString('never'),
          selected: false
        }
    };
    filter_levels[CliqzUnblock.getMode()].selected = true;

    for(var level in filter_levels) {
      var item = doc.createElement('menuitem');
      item.setAttribute('label', filter_levels[level].name);
      item.setAttribute('class', 'menuitem-iconic');

      if(filter_levels[level].selected){
        item.style.listStyleImage = 'url(chrome://cliqzres/content/skin/checkmark.png)';
      }

      item.filter_level = level;
      item.addEventListener('command', function(event) {
        CliqzUtils.log(this, "xxx");
        CliqzUnblock.setMode(this.filter_level);
        CliqzUtils.setTimeout(win.CLIQZ.Core.refreshButtons, 0);
      }, false);

      menupopup.appendChild(item);
    };
    menu.appendChild(menupopup);
    return menu;
  }
};
