var CACHE_PREFIX = "cache___";
var CACHE_TIMEOUT = 1000 * 60 * 60 * 24; // 1 day
var CACHE_LIMIT = 100; // 100 results
Storage.prototype.setObject = function(key, object) {
  localStorage.setItem(key, JSON.stringify(object));
};
Storage.prototype.getObject = function(key) {
  var o = localStorage.getItem(key); return o && JSON.parse(o)
};
Storage.prototype.getCachedResult = function(key) {
  return localStorage.getObject(CACHE_PREFIX
  + key.toLowerCase().trim());
};
Storage.prototype.addToCacheList = function(key) {
  var ob = {key:key, timestamp:Date.now()};
  var list = localStorage.getObject('cache_list');
  if(!list) {
    list = [ob];
  } else {
    for(var i = 0; i < list.length; i++) {
      if(list[i].key == ob.key) {
        list[i] = ob;
        localStorage.setObject('cache_list', list);
        return;
      }
    }
    if(list.length >= CACHE_LIMIT) {
      var item = list.shift();
      localStorage.removeItem(item.key);
      CliqzUtils.log(list, 'storage');
    }
    list.push(ob);
  }
  localStorage.setObject('cache_list', list);
}
Storage.prototype.refreshCache = function() {
  var list = localStorage.getObject('cache_list');
  if(!list) return;
  var len = list.length;
  list = list.filter(function(item) {
    if(Date.now() - item.timestamp > CACHE_TIMEOUT) {
      localStorage.removeItem(item.key);
      return false;
    }
    return true;
  });
  localStorage.setObject('cache_list', list);
  CliqzUtils.log("refreshing cache, " + (len - list.length) + " results uncached", 'storage');
}
Storage.prototype.clearCache = function() {
  var list = localStorage.getObject('cache_list');
  var size = 0;
  if(list) {
    size = list.length;
    list.forEach(function(item) {
      localStorage.removeItem(item.key);
    });
    localStorage.removeItem('cache_list');
  }
  return size + " results uncached";
}
Storage.prototype.cacheResult = function(key, obj) {
  key = CACHE_PREFIX + key.toLowerCase().trim();
  // var object = localStorage.removeHistory(key.split(".")[1], obj)
  localStorage.addToCacheList(key);
  localStorage.setObject(key, obj);
};
Storage.prototype.removeHistory = function(key, obj) {
  var object = JSON.parse(JSON.stringify(obj)); // deep copy
  object._results.forEach(function (res, index) {
    if(res.comment === key + " (history generic)!") {
      object._results.splice(index, 1);
    }
  });
  return object;
};
Storage.prototype.updateRichHeaderData = function(res, index) {
  var cache = localStorage.getCachedResult(res.q);
  if(cache) {
    var response = JSON.parse(cache.response);
    if(response.extra && response.extra.results && response.extra.results[index]) {
      response.extra.results[index] = res;
      cache.response = JSON.stringify(response);
      localStorage.cacheResult(res.q, cache);
    }
  }
  CliqzUtils.log(cache, 'storage');
};
Storage.prototype.getCacheTS = function(key) {
  key = CACHE_PREFIX + key.trim().toLowerCase();
  var list = localStorage.getObject('cache_list');
  if(list) {
    for(var i = list.length - 1; i >= 0; i--) {
      if(list[i].key === key) {
        return list[i].timestamp;
      }
    }
  }
};


window.addEventListener('load', localStorage.refreshCache);