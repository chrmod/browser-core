
// TODO: The "Letzte eingabe" button needs a better architecture
// What we do now is a bit hacky. Because we need to track the state of many
// different windows we get the current window object in every function.

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

var EXPORTED_SYMBOLS = ['CliqzSearchHistory'];


/* Responsible for managing the 'Letzte Eingabe' button/dropdown. */
var CliqzSearchHistory = {
    windows: {},
    /* Inserts the 'Letzte Eingabe' button/dropdown before given element. */
    insertBeforeElement: function (element) {
        var window = CliqzUtils.getWindow();
        var window_id = CliqzUtils.getWindowID();
        var document = window.document;
        var gBrowser = window.gBrowser;
        this.windows[window_id] = {};

        // Set urlbar for current window
        this.windows[window_id].urlbar = document.getElementById('urlbar');
        // Initialize per-tab history for window
        this.windows[window_id].lastQueryInTab = {};
        // Create container element
        this.windows[window_id].searchHistoryContainer = document.createElement('hbox');
        this.windows[window_id].searchHistoryContainer.className = 'hidden'; // Initially hide the container
        element.parentNode.insertBefore(this.windows[window_id].searchHistoryContainer, element);

        // Add last search button to container
        this.windows[window_id].lastSearchElement = document.createElement('hbox');
        this.windows[window_id].lastSearchElement.className = 'cliqz-urlbar-Last-search';
        this.windows[window_id].lastSearchElement.addEventListener('click',
                                                this.returnToLastSearch.bind(this));
        this.windows[window_id].searchHistoryContainer.appendChild(this.windows[window_id].lastSearchElement)

        // Add search history dropdown arrow button to container
        var searcHistoryDropdown = document.createElement('button');
        searcHistoryDropdown.setAttribute('type','panel');
        searcHistoryDropdown.className = 'cliqz-urlbar-Last-search-dropdown-arrow';
        this.windows[window_id].searchHistoryContainer.appendChild(searcHistoryDropdown)

        // Add panel with search history results to dropdown button
        this.windows[window_id].searchHistoryPanel = document.createElement('panel');
        this.windows[window_id].searchHistoryPanel.className = 'cliqz-urlbar-Last-search-dropdown';
        searcHistoryDropdown.appendChild(this.windows[window_id].searchHistoryPanel);

        return this.windows[window_id].searchHistoryContainer;
    },

    /* Puts the query in the dropdown and opens it. */
    returnToLastSearch: function (ev) {
        var window = CliqzUtils.getWindow();
        var window_id = CliqzUtils.getWindowID();
        var document = window.document;
        var gBrowser = window.gBrowser;

        this.windows[window_id].urlbar.mInputField.focus();
        this.windows[window_id].urlbar.mInputField.setUserInput(ev.target.query);

        var action = {
            type: 'activity',
            action: 'last_search'
        };

        CliqzUtils.track(action);
    },

    /* Add query to the last searches list. */
    addToLastSearches: function(newSearch) {
      var window = CliqzUtils.getWindow();
      var window_id = CliqzUtils.getWindowID();
      var document = window.document;
      var gBrowser = window.gBrowser;

      // If the query already existis in the list skip it
      for (var existing of this.windows[window_id].searchHistoryPanel.children) {
        if (newSearch == existing.innerHTML)
          return;
      }
      // If the list gets longer than 7 drop first element
      if (this.windows[window_id].searchHistoryPanel.children.length > 7)
        this.windows[window_id].searchHistoryPanel.removeChild(this.windows[window_id].searchHistoryPanel.lastChild);

      var newSearchElement = document.createElement('hbox');
      newSearchElement.textContent = newSearch;
      newSearchElement.tooltipText = newSearch;
      newSearchElement.query = newSearch;
      newSearchElement.className = 'cliqz-urlbar-Last-search-list';
      newSearchElement.addEventListener('click', this.returnToLastSearch.bind(this));
      this.windows[window_id].searchHistoryPanel.insertBefore(
        newSearchElement,
        this.windows[window_id].searchHistoryPanel.firstChild
      );
    },

    /* */
    lastQuery: function(){
        var window = CliqzUtils.getWindow();
        var window_id = CliqzUtils.getWindowID();
        var document = window.document;
        var gBrowser = window.gBrowser;

        var val = this.windows[window_id].urlbar.value.trim(),
            lastQ = CliqzAutocomplete.lastSearch.trim();

        if(lastQ && val && !CliqzUtils.isUrl(lastQ) && (val == lastQ || !this.isAutocomplete(val, lastQ) )){
            this.showLastQuery(lastQ);
            this.windows[window_id].lastQueryInTab[gBrowser.selectedTab.linkedPanel] = lastQ;
            this.addToLastSearches(lastQ);
        } else {
            // remove last query if the user ended his search session
            if(CliqzUtils.isUrl(lastQ))
                delete this.windows[window_id].lastQueryInTab[gBrowser.selectedTab.linkedPanel];
        }
    },

    hideLastQuery: function(){
        var window = CliqzUtils.getWindow();
        var window_id = CliqzUtils.getWindowID();
        var document = window.document;
        var gBrowser = window.gBrowser;

        this.windows[window_id].searchHistoryContainer.className = 'hidden';
    },

    showLastQuery: function(q){
        var window = CliqzUtils.getWindow();
        var window_id = CliqzUtils.getWindowID();
        var document = window.document;
        var gBrowser = window.gBrowser;

        this.windows[window_id].searchHistoryContainer.className = 'cliqz-urlbar-Last-search-container';
        this.windows[window_id].lastSearchElement.textContent = q;
        this.windows[window_id].lastSearchElement.tooltipText = q;
        this.windows[window_id].lastSearchElement.query = q;
    },

    tabChanged: function(ev){
        var window = CliqzUtils.getWindow();
        var window_id = CliqzUtils.getWindowID();
        var document = window.document;
        var gBrowser = window.gBrowser;

        // Clean last search to avoid conflicts
        CliqzAutocomplete.lastSearch = '';

        if(this.windows[window_id].lastQueryInTab[ev.target.linkedPanel])
            this.showLastQuery(this.windows[window_id].lastQueryInTab[ev.target.linkedPanel]);
        else
            this.hideLastQuery();
    },

    tabRemoved: function(ev){
        var window = CliqzUtils.getWindow();
        var window_id = CliqzUtils.getWindowID();
        var document = window.document;
        var gBrowser = window.gBrowser;

        delete this.windows[window_id].lastQueryInTab[ev.target.linkedPanel];
    },

    isAutocomplete: function(base, candidate){
        var window = CliqzUtils.getWindow();
        var window_id = CliqzUtils.getWindowID();
        var document = window.document;
        var gBrowser = window.gBrowser;

        if(base.indexOf('://') !== -1){
           base = base.split('://')[1];
        }
        base = base.replace('www.', '');

        return base.indexOf(candidate) == 0;
    },
};
