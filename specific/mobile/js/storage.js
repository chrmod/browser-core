
Storage.prototype.setObject = function(key, object) {
  localStorage.setItem(key, JSON.stringify(object));
};
Storage.prototype.getObject = function(key) {
  var o = localStorage.getItem(key); return o && JSON.parse(o)
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
    if(list.length >= 100) {
      localStorage.uncache(0, list);
      console.log(list);
    }
    list.push(ob);
  }
  localStorage.setObject('cache_list', list);
}
Storage.prototype.refreshCache = function() {
  var list = localStorage.getObject('cache_list');
  for(var i = 0; i < list.length; i++) {
    if(Date.now() - list[i].timestamp > 100 * 60 * 60 * 24) {
      localStorage.uncache(i, list);
    }
  }
  localStorage.setObject('cache_list', list);
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
Storage.prototype.uncache = function(idx, list) {
  var item = list[idx];
  localStorage.removeItem(item.key);
  list.splice(idx, 1);
}
Storage.prototype.cacheResult = function(key, obj) {
  var object = localStorage.removeHistory(obj)
  localStorage.addToCacheList(key.toLowerCase().trim());
  localStorage.setObject(key.toLowerCase().trim(), object);
};
Storage.prototype.removeHistory = function(obj) {
  var object = JSON.parse(JSON.stringify(obj)); // deep copy
  object._results.forEach(function (res, index) {
    if(res.comment === " (history generic)!") {
      object._results.splice(index, 1);
    }
  });
  return object;
};