(function(win){

  var cliqz, hist, historyDone = true;
  function getCliqzAndHistoryData(query, callback){
    cliqz = hist = null;
    getCliqzData(query, function(res){
      resultsSink(null, res, query, callback);
    });


    if(historyDone){
        historyDone = false;
        chrome.history.search({ text: query/*, startTime: 0*/}, function(res){
          historyDone = true;
          resultsSink(res.map(function(r){ r.type = 'history'; return r }), null, query, callback);
        });
    }
    else resultsSink([], null, query, callback);
  }

  function resultsSink(_history, _cliqz, q, callback){
    if(q!= $("#search").val()) return; //slow result

    cliqz = cliqz || _cliqz;
    hist = hist || _history;
    if(cliqz && hist){
      var filtered = Filter.deduplicate(hist.concat(cliqz), -1, 1, 1);
      cleaned = cleanResults(filtered);
      callback(cleaned.splice(0, 3));
    }
  }

  // removes bad results like google search pages
  // TODO - To be improved
  function cleanResults(results){
    return results.filter(function(r){
      if(/yahoo|google|bing/.test(CliqzUtils.getDomainFromUrl(r.url))){
        return /#q|search/.test(r.url.substr(0, 40));
      }
      else return true;
    })
  }
  function getCliqzData(query, callback) {
    return $.ajax({
      type: 'GET',
      url: 'https://webbeta.cliqz.com/api/v1/results?q=' + encodeURIComponent(query),
      async: true,
      callback: 'callback',
      contentType: "application/json",
      dataType: 'json',
      success: function(r) {
        return callback(r.result.map(function(r){
          return {
            url: r.url,
            title: r.snippet && r.snippet.title || r.url,
            desc: r.snippet? (r.snippet.desc || r.snippet.snippet): ''
          }
        }));
      }
    });
  };

  win.CliqzAutocomplete = {
    getCliqzAndHistoryData: getCliqzAndHistoryData
  }
})(this);