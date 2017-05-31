import Dropdown from './dropdown';
import Results from './results';
import Popup from './popup';
import inject from '../core/kord/inject';
import SupplementarySearchResult from './results/supplementary-search';
import HistoryManager from '../core/history-manager';
import NavigateToResult from './results/navigate-to';
import { isUrl } from '../core/url';
import { enterSignal, removeFromHistorySignal } from './telemetry';
import AdultAssistant from './adult-content-assistant';
import LocationAssistant from './location-sharing-assistant';

export default class {

  constructor(window, { getSessionCount }) {
    this.ui = inject.module('ui');
    this.core = inject.module('core');
    this.geolocation = inject.module('geolocation');
    this.handleResults = this.handleResults.bind(this);
    this.window = window;
    this.getSessionCount = getSessionCount;
    this.adultAssistant = new AdultAssistant();
    this.locationAssistant = new LocationAssistant({
      updateGeoLocation: this.geolocation.action.bind(this.geolocation, 'updateGeoLocation'),
      resetGeoLocation: this.geolocation.action.bind(this.geolocation, 'resetGeoLocation'),
    });
  }

  init() {
  }

  selectAutocomplete() {
  }

  clearAutocomplete() {
  }

  sessionEnd() {
    this.dropdown.selectedIndex = -1;
    this.adultAssistant.resetAllowOnce();
    this.locationAssistant.resetAllowOnce();
  }

  keyDown(ev) {
    let preventDefault = false;

    // no popup, so no interactions
    if (this.popupClosed) {
      return false;
    }

    switch (ev.code) {
      case 'ArrowUp': {
        this.dropdown.results.firstResult.isAutocompleted = false;
        const result = this.dropdown.previousResult();
        this.ui.windowAction(this.window, 'setUrlbarValue', result.url, result.displayUrl);
        preventDefault = true;
        break;
      }
      case 'ArrowDown': {
        this.dropdown.results.firstResult.isAutocompleted = false;
        const result = this.dropdown.nextResult();
        this.ui.windowAction(this.window, 'setUrlbarValue', result.url, result.displayUrl);
        preventDefault = true;
        break;
      }
      case 'Tab': {
        this.dropdown.results.firstResult.isAutocompleted = false;
        let result;
        if (ev.shiftKey) {
          result = this.dropdown.previousResult();
        } else {
          result = this.dropdown.nextResult();
        }
        this.ui.windowAction(this.window, 'setUrlbarValue', result.url, result.displayUrl);
        preventDefault = true;
        break;
      }
      case 'Enter':
      case 'NumpadEnter': {
        const isNewTab = ev.altKey || ev.metaKey;
        preventDefault = true;
        enterSignal({
          dropdown: this.dropdown,
          newTab: isNewTab,
        });

        if (this.popup.query === this.dropdown.results.query) {
          const urlbarValue = this.popup.urlbarValue;
          const urlbarVisibleValue = this.popup.urlbarVisibleValue;
          const firstResult = this.dropdown.results.firstResult;
          if ((urlbarValue !== urlbarVisibleValue)
            && (this.popup.query === urlbarValue)
            && firstResult.isAutocompleted) {
            this.dropdown.results.firstResult.click(this.window, firstResult.url, ev);
            break;
          }

          const result = this.dropdown.results.findSelectable(this.popup.urlbarVisibleValue);
          if (result) {
            result.click(this.window, result.url, ev);
            break;
          }

          if (this.dropdown.selectedIndex > 0) {
            const selectedResult = this.dropdown.results.get(this.dropdown.selectedIndex);
            selectedResult.click(this.window, selectedResult.url, ev);
            break;
          }
        }

        this.popup.execBrowserCommandHandler(ev, isNewTab ? 'tab' : 'current');
        break;
      }
      case 'Delete':
      case 'Backspace':
        if (ev.metaKey || (ev.altKey && ev.ctrlKey)) {
          break;
        }
        if (ev.code === 'Delete' ||                       // [Shift] + [Ctrl|Alt] + Del (Windows style)
          (ev.code === 'Backspace' && ev.shiftKey)) {     // Shift + Backspace (OSX style)
          const selectedResult = this.dropdown.selectedResult;
          if (!selectedResult.isDeletable) {
            break;
          }

          const url = selectedResult.url;
          HistoryManager.removeFromHistory(url);
          if (selectedResult.isBookmark) {
            HistoryManager.removeFromBookmarks(url);
            removeFromHistorySignal({ withBookmarks: true });
          } else {
            removeFromHistorySignal({});
          }
          this.core.action('queryCliqz', this.dropdown.results.query);
          preventDefault = true;
        }
        break;
      default: {
        preventDefault = false;
      }
    }
    return preventDefault;
  }

  main(element) {
    this.dropdown = new Dropdown(element, this.window);
    this.dropdown.init();
    this.popup = new Popup(this.window);
  }

  handleResults() {
    const {
      query,
      queriedAt,
      rawResults,
    } = this.popup.results();
    const results = new Results({
      query,
      queriedAt,
      rawResults,
      sessionCountPromise: this.getSessionCount(query),
      queryCliqz: this.core.action.bind(this.core, 'queryCliqz'),
      adultAssistant: this.adultAssistant,
      locationAssistant: this.locationAssistant,
    });
    const queryIsUrl = isUrl(results.query);
    const queryIsNotEmpty = query.trim() !== '';
    const firstResult = results.firstResult;
    let didAutocomplete;

    if (results.firstResult) {
      didAutocomplete = this.autocompleteQuery(
        firstResult.url,
        firstResult.title,
      );
      firstResult.isAutocompleted = didAutocomplete;
    }

    // TODO move these to mixer (EX-4497: Old dropdown cleanup)
    if (!didAutocomplete) {
      if (queryIsUrl) {
        results.prepend(
          new NavigateToResult({ text: results.query })
        );
      } else if (queryIsNotEmpty) {
        results.prepend(
          new SupplementarySearchResult({ text: results.query })
        );
      }
    }
    this.dropdown.renderResults(results);
  }
}
