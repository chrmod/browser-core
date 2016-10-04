import { utils } from 'core/cliqz';
import environment from 'platform/environment';
import { isFirefox } from 'core/platform';
import autocomplete from 'autocomplete/autocomplete';
import historyCluster from 'autocomplete/history-cluster';
import ResultProviders from 'autocomplete/result-providers';
import Result from 'autocomplete/result';
import WikipediaDeduplication from 'autocomplete/wikipedia-deduplication';
import { background as AutocompleteBackground } from 'platform/auto-complete-component';
import background from 'core/base/background';

function onReady() {
  return new Promise(resolve => {
    if (isFirefox && Services.search && Services.search.init) {
      Services.search.init(resolve);
    } else {
      resolve();
    }
  });
}

export default background({

  enabled() {
    return true;
  },

  init() {
    this.autocomplete = autocomplete;
    return onReady().then(() => {
      autocomplete.CliqzResultProviders = new ResultProviders();
      AutocompleteBackground.init();
      if (isFirefox) {
        environment.RERANKERS.push(WikipediaDeduplication);
      }

      autocomplete.CliqzHistoryCluster = historyCluster;

      // glueing stuff
      utils.autocomplete = autocomplete;
      utils.registerResultProvider({
        ResultProviders: autocomplete.CliqzResultProviders,
        Result,
      });
    });
  },

  unload() {
    AutocompleteBackground.unload();
  },

  beforeBrowserShutdown() {

  },

  events: {
    'control-center:setDefault-search': function setDefaultSearchEngine(engine) {
      this.autocomplete.CliqzResultProviders.setCurrentSearchEngine(engine);
    },
  },
});
