'use strict';

function showHistory(history) {
  clearTimeout(historyTimer);
  var data = [];
  history = history.results;
  var queries = getListFromStorage("recentQueries");

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
  
  var starredQueries = getListFromStorage('starredQueries').reverse();
  var starredHistory = getListFromStorage('starredHistory').reverse();
  data = data.map(function (item) {
    if(item.url && item.id === starredHistory[0]) {
      item.starred = true;
      starredHistory.shift();
    } else if(item.query && item.id === starredQueries[0]) {
      item.starred = true;
      starredQueries.shift();
    }
    return item;
  });

  if(starMode) {
    displayStarredData(data);
  } else {
    displayData(data);
  }
}

function displayStarredData(data) {
  displayData(data.filter(function(item) {
    return item.date || item.starred; // filter all unstarred records
  }).filter(function(item, index, arr){
    return !item.date || (arr[index + 1] && !arr[index + 1].date); // filter empty days
  }));
}

function displayData(data) {
  if(!CliqzHandlebars.tplCache["conversations"] || !CliqzUtils.locale[CliqzUtils.PREFERRED_LANGUAGE]) {
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

function lunchEditMode(element) {
  clearTimeout(touchTimer);
  touchTimer = null;
  if(editMode) {
    endEditMode();
    lunchEditMode(element);
  } else {
    var checkboxes = Array.from(document.getElementsByClassName('edit__delete'));
    checkboxes.forEach(function(checkbox){
      checkbox.style.display = 'block';
    });
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
  
  var checkboxes = Array.from(document.getElementsByClassName('edit__delete'));
  checkboxes.forEach(function(element){
    var checkbox = element.querySelector('input');
    checkbox.checked = false;
    element.style.display = 'none';
  });
  
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

function starSelected() {
  starSelectedList(selectedQueries, 'starredQueries');
  selectedQueries = [];
  starSelectedList(selectedHistory, 'starredHistory');
  selectedHistory = [];
  getHistory(starMode);
  endEditMode();
}

function starSelectedList(selectedList, storageListName) {
  var storageList = getListFromStorage(storageListName);
  if(storageList.length === 0) {
    localStorage.setItem(storageListName, JSON.stringify(selectedList));
    selectedList = [];
    return;
  }

  var index = 0, id;
  while(index < storageList.length) {
    if(selectedList.length == 0) {
      break;
    }
    id = selectedList[0];
    if(index >= storageList.length && !unfavoriteMode) {
      storageList = storageList.concat(selectedList);
      break;
    } else if(storageList[index] === id) {
      storageList.splice(index, 1);
      selectedList.shift();
    } else if(storageList[index] < id) {
      if(!unfavoriteMode) {
        storageList.splice(index, 0, id);
        index++;
      }
      selectedList.shift();
    } else {
      index++;
    }
  }

  
  
  localStorage.setItem(storageListName, JSON.stringify(storageList));
}

function removeSelectedQueries() {
  var queries = getListFromStorage("recentQueries");
  if(queries.length === 0 || selectedQueries.length === 0) {
    return;
  }

  unfavoriteMode = true;
  starSelectedList(selectedQueries, 'starredQueries');

  var index = 0;
  queries = queries.filter(function(query) {
    return index >= selectedQueries.length || selectedQueries[index] !== query.id || (index++ && false);
  })
  localStorage.setItem("recentQueries", JSON.stringify(queries));
  selectedQueries = [];
  getHistory(starMode);
}

function removeSelectedHistory() {
  unfavoriteMode = true;
  starSelectedList(selectedHistory, 'starredHistory');

  osBridge.removeHistory(selectedHistory);
  selectedHistory = [];
  getHistory(starMode);
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
  var checkbox = item.querySelector('input');
  checkbox.checked = !checkbox.checked;
  var selectAction = item.getAttribute('class').indexOf('question') >= 0 ? selectQuery : selectHistory;
  var id = parseInt(item.getAttribute('data-id'));
  selectAction(id);
  setUnfavoriteMode()
  if(unfavoriteMode) {
    document.getElementById('control_star').innerText = CliqzUtils.getLocalizedString('mobile_history_unstar');
  } else {
    document.getElementById('control_star').innerText = CliqzUtils.getLocalizedString('mobile_history_star');
  }
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

function setUnfavoriteMode() {
  var starredQueries = getListFromStorage('starredQueries');
  var starredHistory = getListFromStorage('starredHistory');
  var diffQueries = getDiff(starredQueries, selectedQueries);
  var diffHistory = getDiff(starredHistory, selectedHistory);
  unfavoriteMode = diffQueries.length !== starredQueries.length || diffHistory.length !== starredHistory.length;
}

function getHistory(isStarred) {
  starMode = isStarred;
  historyTimer = setTimeout(showHistory, 200, {results: []});
  osBridge.searchHistory("", "showHistory");
}

var touchTimer, isTapBlocked, historyTimer;
var editMode = false, starMode = false, unfavoriteMode = false;

function requestHistoryCleanup(removeFavorites) {
  if(removeFavorites) {
    localStorage.setItem('starredHistory', []);
    localStorage.setItem('starredQueries', []);
    localStorage.setItem('recentQueries', []);
    osBridge.cleanHistory();
    return;
  }
  var starredHistory = getListFromStorage('starredHistory');
  osBridge.cleanHistory(starredHistory);
  var starredQueries = getListFromStorage('starredQueries');
  var recentQueries = getListFromStorage('recentQueries');
  selectedQueries = getDiff(recentQueries.map(function(item){return item.id}), starredQueries);
  removeSelectedQueries();
}

function getDiff(arr1, arr2) {
  return arr1.filter(function(id) {
    return arr2.indexOf(id) == -1;
  });
}

function getListFromStorage(listName) {
  var list = localStorage.getItem(listName);
  return list ? JSON.parse(list) : [];
}

System.baseURL = "modules/"
CLIQZ.System = System;
CliqzUtils.initPlatform(System);

CliqzUtils.init(this);
getHistory(starMode);