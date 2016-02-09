import md5 from 'antitracking/md5';
import MapCache from 'antitracking/fixed-size-cache';
import CliqzHumanWeb from 'human-web/human-web';

function parseURL(url) {
  /*  Parse a URL string into a set of sub-components, namely:
   - protocol
   - username
   - password
   - hostname
   - port
   - path
   - parameters (semicolon separated key-values before the query string)
   - query (? followed by & separated key-values)
   - fragment (after the #)
   Given a valid string url, this function returns an object with the above
   keys, each with the value of that component, or empty string if it does not
   appear in the url.

   Additionally, any key-value pairs found in the parameters, query and fragment
   components are extracted into objects in 'parameter_keys', query_keys' and
   'fragment_keys' respectively.
   */
  var o = {};

  var v = url.split('://');
  if (v.length >= 2) {

    o['protocol'] = v[0];
    o['hostname'] = '';
    o['port'] = '';
    o['username'] = '';
    o['password'] = '';
    o['path'] = '/';
    o['query'] = '';
    o['parameters'] = '';
    o['fragment'] = '';
    o['host'] = '';
    var s = v.slice(1, v.length).join('://');

    let state = 'host';
    for(let i=0; i<s.length; i++) {
      let c = s.charAt(i);
      // check for special characters which can change parser state
      if(c == '#' && ['host', 'path', 'query', 'parameters'].indexOf(state) >= 0) {
        // begin fragment
        state = 'fragment';
        continue;
      } else if(c == '?' && ['host', 'path', 'parameters'].indexOf(state) >= 0) {
        // begin query string
        state = 'query';
        continue;
      } else if(c == ';' && ['host', 'path'].indexOf(state) >= 0) {
        // begin parameter string
        state = 'parameters';
        continue;
      } else if(c == '/' && state == 'host') {
        // from host we could go into any next state
        state = 'path';
        continue;
      }

      // add character to key based on state
      o[state] += c;
    }

    if (o['host'] == '') return null;

    var oh = CliqzHumanWeb.parseHostname(o['host']);
    ['hostname', 'port', 'username', 'password'].forEach(function(k) {
      o[k] = oh[k];
    });
    delete o['host'];

    if (state != 'path') {
      o['query_keys'] = getParametersQS(o['query']);
      o['parameter_keys'] = getParametersQS(o['parameters']);
      o['fragment_keys'] = getParametersQS(o['fragment']);
    } else {
      o['query_keys'] = {};
      o['parameter_keys'] = {};
      o['fragment_keys'] = {};
    }
  } else {
    return null;
  }
  return o;
};

function getParametersQS(qs) {
  var res = {},
      _blacklist = {};
  let state = 'key';
  let k = '';
  let v = '';
  var _reviewQS = function(k, v) {
    if (v.indexOf('=') > -1) {
      var items = v.split('=');
      k = k + '_' + items[0];
      v = items.splice(1).join('=');
    }
    return [k, v];
  };
  var _updateQS = function(k, v) {
    if (k in res || k in _blacklist) {
      _blacklist[k] = true;
      var kv = _reviewQS(k, v);
      res[kv[0]] = kv[1];
      // also the old one
      if (k in res) {
        v = res[k];
        kv = _reviewQS(k, v);
        res[kv[0]] = kv[1];
        delete res[k];
      }
    } else {
      res[k] = v;
    }
  };
  var quotes = '';
  for(let i=0; i<qs.length; i++) {
    let c = qs.charAt(i);
    if (c === '"' || c === "'") {
      if (quotes.slice(-1) === c) {
        quotes = quotes.slice(0, quotes.length - 1);
      }
      else {
        quotes += c;
      }
    }
    if(c == '=' && state == 'key' && k.length > 0) {
      state = 'value';
      continue;
    } else if((c === '&' || c === ';') && quotes === '') {
      if(state == 'value') {
        state = 'key';
        // in case the same key already exists
        _updateQS(k, v);
      } else if(state == 'key' && k.length > 0) {
        // key with no value, set value='true'
        res[k] = 'true';
      }
      k = '';
      v = '';
      continue;
    }
    switch(state) {
    case 'key':
      k += c;
      break;
    case 'value':
      v += c;
      break;
    }
  }
  if(state == 'value') {
    state = 'key';
    _updateQS(k, v);
  } else if(state == 'key' && k.length > 0) {
    res[k] = 'true';
  }
  return _flattenJson(res);
};

// The value in query strings can be a json object, we need to extract the key-value pairs out
function _flattenJson(obj) {
  if (typeof obj === 'string' && (obj.indexOf('{') > -1 || obj.indexOf('[') > -1)) {
    try {
      obj = JSON.parse(obj);
      if (typeof obj !== 'object' && typeof obj !== 'array') {
        obj = JSON.stringify(obj);
      }
    } catch(e) {}
  }
  var res = {};
  switch(typeof obj) {
  case 'object':
    for (var key in obj) {
      var r = _flattenJson(obj[key]);
      for (var _key in r) {
        res[key + _key] = r[_key];
      }
    }
    break;
  case 'array':
    obj.forEach(function(e, i) {
      var r = _flattenJson(e);
      for (var _key in r) {
        res[i + _key] = r[_key];
      }
    });
    break;
  case 'number':
    obj = JSON.stringify(obj);
  default:
    res[''] = obj;
  }
  return res;
};

function dURIC(s) {
  // avoide error from decodeURIComponent('%2')
  try {
    return decodeURIComponent(s);
  } catch(e) {
    return s;
  }
};

function getHeaderMD5(headers) {
  var qsMD5 = {};
  for (var key in headers) {
    var tok = dURIC(headers[key]);
    while (tok != dURIC(tok)) {
      tok = dURIC(tok);
    }
    qsMD5[md5(key)] = md5(tok);
  }
  return qsMD5;
};

/**
 URLInfo class: holds a parsed URL.
 */
var URLInfo = function(url) {
  this.url_str = url;
  // map parsed url parts onto URL object
  let url_parts = parseURL(url);
  for(let k in url_parts) {
    this[k] = url_parts[k];
  }
  return this;
}

URLInfo._cache = new MapCache(function(url) { return new URLInfo(url); }, 100);

/** Factory getter for URLInfo. URLInfo are cached in a LRU cache. */
URLInfo.get = function(url) {
  if (!url) return "";
  return URLInfo._cache.get(url);
}

URLInfo.prototype = {
  toString: function() {
    return this.url_str;
  },
  getKeyValues: function () {
    var kvList = [];
    for (let kv of [this.query_keys, this.parameter_keys]) {
      for (let key in kv) {
        kvList.push({k: key, v: kv[key]});
      }
    }
    return kvList;
  },
  getKeyValuesMD5: function () {
    var kvList = this.getKeyValues();
    return kvList.map(function (kv) {
      kv.k_len = kv.k.length;
      kv.v_len = kv.v.length;
      kv.k = md5(kv.k);
      kv.v = md5(kv.v);
      return kv;
    });
  }
};

export {
  parseURL,
  getParametersQS,
  dURIC,
  getHeaderMD5,
  URLInfo
};
