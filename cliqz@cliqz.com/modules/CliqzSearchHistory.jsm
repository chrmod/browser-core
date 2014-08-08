
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.5.04');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm?v=0.5.04');

var EXPORTED_SYMBOLS = ['CliqzSearchHistory'];

var window = CliqzUtils.getWindow();
var document = window.document;
var gBrowser = window.gBrowser;

/* Responsible for managing the 'Letzte Eingabe' button/dropdown. */
var CliqzSearchHistory = {
    urlbar: document.getElementById('urlbar'),
    searchHistoryContainer: document.createElement('hbox'),
    lastSearchElement: document.createElement('hbox'),
    searchHistoryPanel: document.createElement('panel'),
    lastQueryInTab:{},

    /* Inserts the 'Letzte Eingabe' button/dropdown before given element. */
    insertBeforeElement: function (element) {
        // Create container element
        this.searchHistoryContainer.className = 'hidden'; // Initially hide the container
        element.parentNode.insertBefore(this.searchHistoryContainer, element);

        // Add last search button to container
        this.lastSearchElement.className = 'cliqz-urlbar-Last-search';
        this.lastSearchElement.addEventListener('click',
                                                this.returnToLastSearch.bind(this));
        this.searchHistoryContainer.appendChild(this.lastSearchElement)

        // Add search history dropdown arrow button to container
        var searcHistoryDropdown = document.createElement('button');
        searcHistoryDropdown.setAttribute('type','panel');
        searcHistoryDropdown.className = 'cliqz-urlbar-Last-search-dropdown-arrow';
        this.searchHistoryContainer.appendChild(searcHistoryDropdown)

        // Add panel with search history results to dropdown button
        searcHistoryDropdown.appendChild(this.searchHistoryPanel);

        return this.searchHistoryContainer;
    },

    /* Puts the query in the dropdown and opens it. */
    returnToLastSearch: function (ev) {
        this.urlbar.mInputField.focus();
        this.urlbar.mInputField.setUserInput(ev.target.query);

        var action = {
            type: 'activity',
            action: 'last_search'
        };

        CliqzUtils.track(action);
    },

    /* Add query to the last searches list. */
    addToLastSearches: function(newSearch) {
      // If the query already existis in the list skip it
      for (var existing of this.searchHistoryPanel.children) {
        if (newSearch == existing.innerHTML)
          return;
      }
      // If the list gets longer than 7 drop first element
      if (this.searchHistoryPanel.children.length > 7)
        this.searchHistoryPanel.removeChild(this.searchHistoryPanel.lastChild);

      var newSearchElement = document.createElement('hbox');
      newSearchElement.textContent = newSearch;
      newSearchElement.tooltipText = newSearch;
      newSearchElement.query = newSearch;
      newSearchElement.className = 'cliqz-urlbar-Last-search-list';
      newSearchElement.addEventListener('click', this.returnToLastSearch.bind(this));
      this.searchHistoryPanel.insertBefore(
        newSearchElement,
        this.searchHistoryPanel.firstChild
      );
    },

    /* */
    lastQuery: function(){
        var val = this.urlbar.value.trim(),
            lastQ = CliqzAutocomplete.lastSearch.trim();

        if(lastQ && val && !CliqzUtils.isUrl(lastQ) && (val == lastQ || !this.isAutocomplete(val, lastQ) )){
            this.showLastQuery(lastQ);
            this.lastQueryInTab[gBrowser.selectedTab.linkedPanel] = lastQ;
            this.addToLastSearches(lastQ);
        } else {
            // remove last query if the user ended his search session
            if(CliqzUtils.isUrl(lastQ))
                delete this.lastQueryInTab[gBrowser.selectedTab.linkedPanel];
        }
    },

    hideLastQuery: function(){
        this.searchHistoryContainer.className = 'hidden';
    },

    showLastQuery: function(q){
        this.searchHistoryContainer.className = 'cliqz-urlbar-Last-search-container';
        this.lastSearchElement.textContent = q;
        this.lastSearchElement.tooltipText = q;
        this.lastSearchElement.query = q;
    },

    tabChanged: function(ev){
        // Clean last search to avoid conflicts
        CliqzAutocomplete.lastSearch = '';

        if(this.lastQueryInTab[ev.target.linkedPanel])
            this.showLastQuery(this.lastQueryInTab[ev.target.linkedPanel]);
        else
            this.hideLastQuery();
    },

    tabRemoved: function(ev){
        delete this.lastQueryInTab[ev.target.linkedPanel];
    },

    isAutocomplete: function(base, candidate){
        if(base.indexOf('://') !== -1){
           base = base.split('://')[1];
        }
        base = base.replace('www.', '');

        return base.indexOf(candidate) == 0;
    },
};
