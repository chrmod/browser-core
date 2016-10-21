import { utils } from 'core/cliqz';
import background from "core/base/background";
import { txtToDom } from 'core/dom-parser';

class Gmail {
  constructor() {
    this.url = 'https://mail.google.com/mail/u/0/feed/atom' + '?rand=' + Math.round(Math.random() * 10000000);
  }

  count() {
    return this.get(this.url).then(response => this.getNotificationCount(response.response));
  }

  getNotificationCount(txt) {
    var feed = txtToDom(txt);
    var fullCount = 0;
    var arr = feed.getElementsByTagName("fullcount");
    if(arr && arr.length) {
      var tmp = arr[0].textContent;
      if(tmp) fullCount = parseInt(tmp) || 0;
    }
    return fullCount;
  }

  get(url, headers, data, timeout) {
    return new Promise(function(resolve, reject) {
      headers = headers || {};

      let req = Cc['@mozilla.org/xmlextras/xmlhttprequest;1']
        .createInstance(Ci.nsIXMLHttpRequest);
      req.mozBackgroundRequest = true;  //No authentication
      req.timeout = timeout;
      req.open('GET', url, true);
      for(let id in headers) {
        req.setRequestHeader(id, headers[id]);
      }

      req.onreadystatechange = function() {
        if (req.readyState === 4) {
          resolve(req);
        }
      };

      req.channel
        .QueryInterface(Ci.nsIHttpChannelInternal)
        .forceAllowThirdPartyCookie = true;
      if(data) {
        let arr = [];
        for (let e in data) {
          arr.push(e + '=' + data[e]);
        }
        data = arr.join('&');
      }
      req.send(data ? data : '');
      return req;
    });
  }
}

export default background({
  enabled() { return true; },

  init(settings) {
    this.providers = Object.create(null);
    this.providers.gmail = new Gmail();
  },

  unload() {

  },

  beforeBrowserShutdown() {

  },

  actions: {
    /**
    * get configuration with notification sources
    **/
    getConfig() {
      return {
        sources: Object.keys(this.providers)
      }
    },

    /**
    * query store for notifications for specified sources
    */
    getNotificationsCount() {
      return this.providers.gmail.count().then(count => {
        return {
          'gmail.com': count
        }
      })
    },

    /**
    * Add a new source to configuration
    **/
    watch(url) {

    },

    /**
    * Remove a url from notification sources
    **/
    unwatch(url) {

    }
  }
})
