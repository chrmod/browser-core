import { HttpRequestContext } from 'platform/antitracking/http-request-context';
import { ChannelListener } from 'platform/antitracking/channel-listener';
import { utils } from 'core/cliqz';

Cu.import("resource://gre/modules/Services.jsm");

var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService),
    nsIHttpChannel = Components.interfaces.nsIHttpChannel;

var observer = {
  observe(subject, topic, data) {
    const aChannel = subject.QueryInterface(nsIHttpChannel),
        requestContext = new HttpRequestContext(aChannel),
        event = topicsToEvents[topic];

    // unknown observer topic
    if (!event) {
      return;
    }
    if(aChannel.status === Components.results.NS_BINDING_ABORTED) {
      // request already cancelled
      return;
    }

    let requestInfo = {
      url: requestContext.url,
      method: requestContext.method,
      frameId: requestContext.getInnerWindowID(),
      parentFrameId: requestContext.getParentWindowID() || -1,
      tabId: requestContext.getOriginWindowID() || -1,
      type: requestContext.getContentPolicyType(),
      originUrl: requestContext.getLoadingDocument(),
      isPrivate: requestContext.isChannelPrivate(),
      responseStatus: topic.startsWith('http-on-examine-') ? requestContext.channel.responseStatus : undefined,
      isCached: topic === 'http-on-examine-cached-response'
    }
    // use getters for headers
    requestInfo.getRequestHeader = requestContext.getRequestHeader.bind(requestContext);
    requestInfo.getResponseHeader = requestContext.getResponseHeader.bind(requestContext);
    requestInfo.getPostData = requestContext.getPostData.bind(requestContext);

    for (let listener of webRequest[event].listeners) {
      // ignore filter for the moment
      const {fn, filter, extraInfo} = listener;
      const blockingResponse = fn(requestInfo);

      if (extraInfo && extraInfo.indexOf('blocking') > -1 && blockingResponse) {

        if ( blockingResponse.cancel === true ) {
          subject.cancel(Components.results.NS_BINDING_ABORTED);
          return;
        }

        if ( blockingResponse.requestHeaders ) {
          // channel listener for post redirect?
          blockingResponse.requestHeaders.forEach((h) => {
            aChannel.setRequestHeader(h.name, h.value, false);
          });
        }

        if ( blockingResponse.redirectUrl ) {
          try {
            aChannel.URI.spec = blockingResponse.redirectUrl;
          } catch(error) {
            aChannel.redirectTo(Services.io.newURI(blockingResponse.redirectUrl, null, null));
          }
          // ensure header changes follow redirected url
          if ( blockingResponse.requestHeaders ) {
            aChannel.notificationCallbacks = new ChannelListener(blockingResponse.requestHeaders);
          }
        }
      }
    }
  }
}

class TopicListener {
  constructor(topics) {
    this.topics = topics;
    this.listeners = [];
  }

  _addObservers() {
    this.topics.forEach( (topic) => {
      observerService.addObserver(observer, topic, false);
    });
    httpContextManager.notifyAdd();
  }

  _removeObservers() {
    this.topics.forEach( (topic) => {
      observerService.removeObserver(observer, topic);
    });
    httpContextManager.notifyRemove();
  }

  addListener(listener, filter, extraInfo) {
    if ( this.listeners.length === 0 ) {
      this._addObservers();
    }
    this.listeners.push({ fn: listener, filter, extraInfo});
  }

  removeListener(listener) {
    const ind = this.listeners.findIndex((l) => {
      return l.fn === listener;
    });
    if (ind > -1) {
      this.listeners.splice(ind, 1);
    }
    if ( this.listeners.length === 0 ) {
      this._removeObservers();
    }
  }
};

// Manage the initialisation and cleanup of the http-request-context cleaner.
var httpContextManager = {
  initialised: false,
  listenerCtr: 0,
  notifyAdd: function() {
    if ( this.listenerCtr === 0 ) {
      HttpRequestContext.initCleaner();
    }
    this.listenerCtr++;
  },
  notifyRemove: function() {
    this.listenerCtr--;
    if ( this.listenerCtr === 0 ) {
      HttpRequestContext.unloadCleaner();
    }
  }
}

var topicsToEvents = {
  'http-on-opening-request': 'onBeforeRequest',
  'http-on-examine-response': 'onHeadersReceived',
  'http-on-examine-cached-response': 'onHeadersReceived',
  'http-on-modify-request': 'onBeforeSendHeaders'
};

var webRequest = {
  onBeforeRequest: new TopicListener(['http-on-opening-request']),
  onBeforeSendHeaders: new TopicListener(['http-on-modify-request']),
  onHeadersReceived: new TopicListener(['http-on-examine-response', 'http-on-examine-cached-response'])
};

export default webRequest;
