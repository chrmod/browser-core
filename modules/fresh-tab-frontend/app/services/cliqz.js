import Ember from 'ember';
import DS from 'ember-data';

export default Ember.Service.extend({
  init() {
    this._super(...arguments);

    this.callbacks = Object.create(null);

    window.addEventListener("message", ev => {
      let message = {};

      try {
        message = JSON.parse(ev.data);
      } catch (e) {
        // non CLIQZ or invalid message should be ignored
      }

      if (message.type === "response") {
        console.log("RESPONSE");
        this.callbacks[message.action].call(null, message.response);
      }
    });
  },

  sendTelemetry(msg) {
    this.callbacks.sendTelemetry = () => {};
    window.postMessage(JSON.stringify({
      target: "cliqz",
      module: "core",
      action: "sendTelemetry",
      args: [msg]
    }) , "*")
  },

  getSpeedDials() {
    let promise = new Promise( resolve => {
      this.callbacks.getSpeedDials = resolve;
    });

    window.postMessage(JSON.stringify({
      target: "cliqz",
      module: "freshtab",
      action: "getSpeedDials"
    }) , "*")

    return DS.PromiseArray.create({ promise });
  },

   getNews() {
    let promise = new Promise( resolve => {
      this.callbacks.getNews = resolve;
    });

    window.postMessage(JSON.stringify({
      target: "cliqz",
      module: "freshtab",
      action: "getNews"
    }) , "*")

    return DS.PromiseArray.create({ promise });

    /*return [
      {
        title: 111,
        short_title: 222,
        displayUrl: 333,
        url: 444,
        logo: 555,
        underline: false,
        personalized: false
      },
      { title: 111,
        short_title: 222,
        displayUrl: 333,
        url: 444,
        logo: 555,
        underline: false,
        personalized: false
      }
    ]*/
  }
});
