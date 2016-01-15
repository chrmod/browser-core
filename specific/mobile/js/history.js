'use strict';

function showHistory(history) {
  var data = [];
  history = history.results;
  var queries = [];
  var q = localStorage.getItem("recentQueries");
  if(q) {
    queries = JSON.parse(q);
  }

  if(history.length == 0 && queries.length == 0) {
    showNoData();
    return;
  }

  for(var i=0;i<history.length;i++) {
    history[i].domain = history[i].url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
  }

  history.reverse();
  queries.reverse();
  var hi = 0;
  var qi = 0;
  var date = "";
  while(true) {
    if(hi >= history.length || qi >= queries.length) {
      break;
    }

    if(history[hi].timestamp <= queries[qi].timestamp) {
      if(getDateFromTimestamp(history[hi].timestamp) !== date) {
        data.push({date: getDateFromTimestamp(history[hi].timestamp)});
        date = getDateFromTimestamp(history[hi].timestamp);
      }
      data.push(history[hi]);

      hi++;
    } else {
      if(getDateFromTimestamp(queries[qi].timestamp) !== date) {
        data.push({date: getDateFromTimestamp(queries[qi].timestamp)});
        date = getDateFromTimestamp(queries[qi].timestamp);
      }
      data.push(queries[qi]);
      qi++;
    }
  }
  while(hi < history.length) {
    if(getDateFromTimestamp(history[hi].timestamp) !== date) {
      data.push({date: getDateFromTimestamp(history[hi].timestamp)});
      date = getDateFromTimestamp(history[hi].timestamp);
    }
    data.push(history[hi]);
    hi++;
  }
  while(qi < queries.length) {
    if(getDateFromTimestamp(queries[qi].timestamp) !== date) {
      data.push({date: getDateFromTimestamp(queries[qi].timestamp)});
      date = getDateFromTimestamp(queries[qi].timestamp);
    }
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

  document.body.scrollTop = height + 100;

  document.getElementById("search_input").addEventListener("keyup", function() {
      filterHistory(this.value);
  });

  CLIQZEnvironment.addEventListenerToElements(".question, .answer", "click", function () {
    var targeType = this.className === "question" ? "query" : "url";
    CliqzUtils.telemetry({
      type: "history",
      action: "click",
      target_type: targeType,
      target_index: parseInt(this.dataset.index),
      target_length: this.querySelector("." + targeType).textContent.length,
      target_ts: parseInt(this.dataset.timestamp)
    });
  });
  var queryCount = data.filter(function (item) { return item.query; }).length,
      urlCount = data.filter(function (item) { return item.url; }).length;
  CliqzUtils.telemetry({
    type: "history",
    action: "show",
    active_day_count: data.length - queryCount - urlCount,
    query_count: queryCount,
    url_count: urlCount
  });
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

Handlebars.registerHelper('conversationsTime', function(time) {
    var d = new Date(time);
    var hours = d.getHours();
    hours = hours > 9 ? hours : '0' + hours
    var minutes = d.getMinutes();
    minutes = minutes > 9 ? minutes : '0' + minutes
    var formatedDate = hours + ':' + minutes;
    return formatedDate;
});

function getDateFromTimestamp(time) {
    var d = new Date(time);

    var days = d.getDate();
    days = days > 9 ? days : '0' + days

    var months = d.getMonth()+1;
    months = months > 9 ? months : '0' + months

    var year = d.getFullYear();

    var formatedDate = days + '.' + months + '.' + year;
    return formatedDate;
}

Handlebars.registerHelper('conversationsDate', getDateFromTimestamp);

function filterHistory(value) {
    var framers = document.getElementsByClassName("framer");
    for(var i=0;i<framers.length;i++) {
        if(framers[i].childNodes[1].firstChild.textContent.toLowerCase().match(value.toLowerCase())) {
            framers[i].parentNode.style.display = "block";
        } else {
            framers[i].parentNode.style.display = "none";
        }
    }
}

function showNoData() {
  if(document.body) {
    document.body.innerHTML = "Du hast noch keine Suchen: schau' später nochmal vorbei";
  } else {
    setTimeout(showNoData, 100);
  }
}

osBridge.searchHistory("", "showHistory")
