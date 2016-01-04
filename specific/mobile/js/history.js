'use strict';

function showHistory(history) {
  var data = [];
  history = history.results;
  var queries = [];
  var q = localStorage.getItem("recentQueries");
  if(q) {
    queries = JSON.parse(q);
  }

  history.reverse();
  queries.reverse();
  var hi = 0;
  var qi = 0;
  while(true) {
    if(hi >= history.length || qi >= queries.length) {
      break;
    }
    if(history[hi].timestamp <= queries[qi].timestamp) {
//       append(history[hi].title, history[hi].url, "link");
      data.push(history[hi]);
      hi++;
    } else {
//       append(queries[qi].query, ((Date.now() - queries[qi].timestamp) / 1000).toFixed(0) + " seconds ago", "queries");
      data.push(queries[qi]);
      qi++;
    }
  }
  while(hi < history.length) {
//     append(history[hi].title, history[hi].url, "link");
    data.push(history[hi]);
    hi++;
  }
  while(qi < queries.length) {
    // append(queries[qi].query, ((Date.now() - queries[qi].timestamp) / 1000).toFixed(0) + " seconds ago", "queries");
    data.push(queries[qi]);
    qi++;
  }
  displayData(data);
}

function displayData(data) {
  if(!CliqzHandlebars.tplCache["conversations"]) {
    return setTimeout(displayData, 100, data);
  }
  document.body.innerHTML = CliqzHandlebars.tplCache["conversations"]({data: data});

  var B = document.body,
      H = document.documentElement,
      height

  if (typeof document.height !== 'undefined') {
      height = document.height // For webkit browsers
  } else {
      height = Math.max( B.scrollHeight, B.offsetHeight,H.clientHeight, H.scrollHeight, H.offsetHeight );
  }

  document.body.scrollTop = height + 500;
}

function testActiveWebViewOnIos() {
  document.body.innerHTML += "Test Succeeded";
}

function append(title, timestamp, styleClass) {
  var div = document.createElement('div');
  div.setAttribute('class', styleClass);
  var head = document.createElement('p');
  head.setAttribute('class', 'text-big');
  head.innerHTML = title;
  var p = document.createElement('p');
  p.setAttribute('class', 'time');
  p.innerHTML = timestamp;
  div.appendChild(head);
  div.appendChild(p);
  document.body.appendChild(div);
}

window.addEventListener('load', function() {
  osBridge.searchHistory("", "showHistory")
});

Handlebars.registerHelper('conversationsTime', function(time) {
    var d = new Date(time);
    var hours = d.getHours();
    hours = hours > 9 ? hours : '0' + hours
    var minutes = d.getMinutes();
    minutes = minutes > 9 ? minutes : '0' + minutes
    var formatedDate = hours + ':' + minutes;
    return formatedDate;
});