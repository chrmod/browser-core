'use strict';

function showHistory(history) {
  var data = [];
  history = history.results;
  var queries = [];
  var q = localStorage.getItem("recentQueries");
  if(q) {
    queries = JSON.parse(q);
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

  
  CLIQZEnvironment.addEventListenerToElements('.question, .answer', 'touchstart', function () {
    touchTimer = setTimeout(lunchEditMode, 500, this);
  });
  CLIQZEnvironment.addEventListenerToElements('.question, .answer', 'touchend', function () {
    var type = this.getAttribute('class');
    var clickAction = type.indexOf('question') >= 0 ? osBridge.notifyQuery : osBridge.openLink;
    console.log('timer', touchTimer);
    if(touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    } else {
      return;
    }
    if(isTapBlocked) {
      isTapBlocked = false;
      return;
    }
    if(editMode) {
      selectItem(this);
    } else {
      clickAction(this.getAttribute('data'));
    }
  });
  CLIQZEnvironment.addEventListenerToElements('.question, .answer', 'touchmove', function () {
    isTapBlocked = true;
    clearTimeout(touchTimer);
  });
}

var editMode = false;

function lunchEditMode(element) {
  clearTimeout(touchTimer);
  touchTimer = null;
  if(editMode) {
    endEditMode();
    lunchEditMode(element);
  } else {
    var div = document.getElementById('control');
    div.style.display = 'block';
    editMode = true;
    selectedQueries = [];
    selectedHistory = [];
    selectItem(element);
  }
}

function endEditMode() {
  var framers = [].slice.call(document.getElementsByClassName('framer'));
  framers.forEach(function(item) {item.setAttribute('class', 'framer')});
  
  var div = document.getElementById('control');
  div.style.display = 'none';
  editMode = false;
  selectedQueries = [];
  selectedHistory = [];
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

var selectedQueries = [];
var selectedHistory = [];

function removeSelectedQueries() {
  var queries = localStorage.getItem("recentQueries");
  if(!queries || selectedQueries.length === 0) {
    return;
  }
  queries = JSON.parse(queries);

  var index = 0;
  queries = queries.filter(function(query) {
    return index >= selectedQueries.length || selectedQueries[index] !== query.id || (index++ && false);
  })
  localStorage.setItem("recentQueries", JSON.stringify(queries));
  selectedQueries = [];
  osBridge.searchHistory("", "showHistory")
}

function removeSelectedHistory() {
  osBridge.removeHistory(selectedHistory);
  selectedHistory = [];
  osBridge.searchHistory("", "showHistory")
}

function removeSelected() {
  removeSelectedQueries();
  removeSelectedHistory();
  endEditMode();
}

function selectQuery(id) {
  for(var i = 0; i < selectedQueries.length; i++) {
    if(selectedQueries[i] === id) {
      selectedQueries.splice(i, 1);
      return;
    } else if(selectedQueries[i] < id) {
      selectedQueries.splice(i, 0, id);
      return;
    } 
  }
  selectedQueries.push(id);
}

function selectHistory(id) {
  for(var i = 0; i < selectedHistory.length; i++) {
    if(selectedHistory[i] === id) {
      selectedHistory.splice(i, 1);
      return;
    } else if(selectedHistory[i] < id) {
      selectedHistory.splice(i, 0, id);
      return;
    } 
  }
  selectedHistory.push(id);
}

function selectItem(item) {
  var selectAction = item.getAttribute('class').indexOf('question') >= 0 ? selectQuery : selectHistory;
  selectAction(parseInt(item.getAttribute('data-id')));
  var framer = item.getElementsByClassName('framer')[0];
  if(framer.getAttribute('class').indexOf('selected') >= 0) {
    framer.setAttribute('class', 'framer');
  } else {
    framer.setAttribute('class', 'framer selected');
  }
  if(selectedQueries.length + selectedHistory.length == 0) {
    endEditMode();
  }
}

var touchTimer, isTapBlocked;

osBridge.searchHistory("", "showHistory")
