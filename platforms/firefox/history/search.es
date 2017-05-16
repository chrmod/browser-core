/* eslint-disable */
// callback called multiple times
export default (function() {
  var hist = null;

  return function(q, callback) {
    if(hist === null) { //lazy
      // history autocomplete provider is removed
      // https://hg.mozilla.org/mozilla-central/rev/44a989cf6c16
      if (CLIQZEnvironment.AB_1076_ACTIVE) {
        console.log('AB - 1076: Initialize custom provider');
        // If AB 1076 is not in B or firefox version less than 49 it will fall back to firefox history
        var provider = Cc["@mozilla.org/autocomplete/search;1?name=cliqz-history-results"] ||
                        Cc["@mozilla.org/autocomplete/search;1?name=history"] ||
                        Cc["@mozilla.org/autocomplete/search;1?name=unifiedcomplete"];
        hist = provider.getService(Ci["nsIAutoCompleteSearch"]);
      } else {
        var provider = Cc["@mozilla.org/autocomplete/search;1?name=history"] ||
                        Cc["@mozilla.org/autocomplete/search;1?name=unifiedcomplete"];
        hist = provider.getService(Ci["nsIAutoCompleteSearch"]);
      }
    }
    // special case: user has deleted text from urlbar
    if(q.length != 0 && urlbar().value.length == 0) {
      return;
    }

    hist.startSearch(q, 'enable-actions', null, {
      onSearchResult: function(ctx, result) {
        var res = [];
        for (var i = 0; result && i < result.matchCount; i++) {
          if (result.getValueAt(i).indexOf('https://cliqz.com/search?q=') === 0) {
            continue;
          }
          if(result.getStyleAt(i).indexOf('heuristic') != -1) {
            // filter out "heuristic" results
            continue;
          }

          if(result.getStyleAt(i).indexOf('switchtab') != -1) {
            try {
              let [mozAction, cleanURL] = utils.cleanMozillaActions(result.getValueAt(i));
              let label;

              // ignore freshtab and history
              if (cleanURL.indexOf('resource://cliqz/fresh-tab-frontend/') === 0) {
                continue;
              }
              if (cleanURL.indexOf('https://cliqz.com/search?q=') === 0) {
                continue;
              }

              try {
                // https://bugzilla.mozilla.org/show_bug.cgi?id=419324
                uri = makeURI(action.params.url);
                label = losslessDecodeURI(uri);
              } catch (e) {}

              res.push({
                style:   result.getStyleAt(i),
                value:   cleanURL,
                image:   result.getImageAt(i),
                comment: result.getCommentAt(i),
                label:   label || cleanURL
              });
            } catch(e){
              // bummer! This was unexpected
            }
          }
          else {
            res.push({
              style:   result.getStyleAt(i),
              value:   result.getValueAt(i),
              image:   result.getImageAt(i),
              comment: result.getCommentAt(i),
              label:   result.getLabelAt(i)
            });
          }
        }
        callback({
          query: q,
          results: res,
          ready:  result.searchResult != result.RESULT_NOMATCH_ONGOING &&
                  result.searchResult != result.RESULT_SUCCESS_ONGOING
        })
      }
    });
  }
})();