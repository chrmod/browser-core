import { getPref } from './prefs';

export function handleQuerySuggestions(suggestions) {
  // TODO: design mobile prefs better to allow easier access for booleans
  if (suggestions && getPref("suggestionsEnabled", "false") !== "false") {
    osAPI.showQuerySuggestions(suggestions);
  }
}
