import autocomplete from "autocomplete/autocomplete";
import CliqzResultProviders from "autocomplete/result-providers";
import { utils, environment } from "core/cliqz";
import Search from "autocomplete/search";
import {Window as AutocompleteWindow} from "platform/auto-complete-component";


export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    utils.log('-- INITIALIAZING WINDOW ---', 'DEBUG');
    AutocompleteWindow.init(this.window);
    utils.log('-- INITIALIAZED WINDOW ---', 'DEBUG');
  }
  //
  //  this.window.CliqzAutocomplete = autocomplete;
  // this.window.Search = Search;

  unload() {
    AutocompleteWindow.unload(this.window)
  }

  createButtonItem() {
    if (utils.getPref("cliqz_core_disabled", false)) return;

    const doc = this.window.document,
      menu = doc.createElement('menu'),
      menupopup = doc.createElement('menupopup'),
      engines = autocomplete.CliqzResultProviders.getSearchEngines(),
      def = Services.search.currentEngine.name;

    menu.setAttribute('label', utils.getLocalizedString('btnDefaultSearchEngine'));

    for(var i in engines){

      var engine = engines[i],
      item = doc.createElement('menuitem');
      item.setAttribute('label', '[' + engine.prefix + '] ' + engine.name);
      item.setAttribute('class', 'menuitem-iconic');
      item.engineName = engine.name;
      if(engine.name == def){
        item.style.listStyleImage = 'url(' + utils.SKIN_PATH + 'checkmark.png)';
      }
      // TODO: Where is this listener removed?
      item.addEventListener('command', (function(event) {
        autocomplete.CliqzResultProviders.setCurrentSearchEngine(event.currentTarget.engineName);
        utils.setTimeout(this.window.CLIQZ.Core.refreshButtons, 0);
        utils.telemetry({
          type: 'activity',
          action: 'cliqz_menu_button',
          button_name: 'search_engine_change_' + event.currentTarget.engineName
        });
      }).bind(this), false);

      menupopup.appendChild(item);
    }

    menu.appendChild(menupopup);

    return menu;
  }
}
