'use strict';

function showHistory(history) {
  history = history.results;
  var queries = [];
  var q = localStorage.getItem("recentQueries");
  if(q) {
    queries = JSON.parse(q);
  }
  var hi = 0;
  var qi = 0;
  while(true) {
    if(hi >= history.length || qi >= queries.length) {
      break;
    }
    if(history[hi].timestamp > queries[qi].timestamp) {
      append(history[hi].title, history[hi].url, "link");
      hi++;
    } else {
      append(queries[qi].query, ((Date.now() - queries[qi].timestamp) / 1000).toFixed(0) + " seconds ago", "query");
      qi++;
    }
  }
  while(hi < history.length) {
    append(history[hi].title, history[hi].url, "link");
    hi++;
  }
  while(qi < queries.length) {
    append(queries[qi].query, ((Date.now() - queries[qi].timestamp) / 1000).toFixed(0) + " seconds ago", "query");
    qi++;
  }
}

function append(title, timestamp, styleClass) {
  var div = document.createElement('div');
  div.setAttribute('class', styleClass);
  var head = document.createElement('p');
  head.setAttribute('class', 'text-big');
  head.innerHTML = title;
  var p = document.createElement('p');
  p.setAttribute('class', 'text-small');
  p.innerHTML = timestamp;
  div.appendChild(head);
  div.appendChild(p);
  document.body.appendChild(div);
}

window.addEventListener('load', function() {
  osBridge.searchHistory("", "showHistory")
});