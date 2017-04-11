import { getPref } from './prefs';

export function handleQuerySuggestions(suggestions) {
  if (suggestions && getPref("suggestionsEnabled", false)) {
    osAPI.showQuerySuggestions(suggestions);
  }
}
