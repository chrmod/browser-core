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
        this.callbacks[message.action].call(null, message.response);
      }
    });
  },

  getConfig() {
    let promise = new Promise( resolve => {
      this.callbacks.getConfig = resolve;
    });

    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'freshtab',
      action: 'getConfig'
    }), '*');

    return DS.PromiseObject.create({ promise });
  },

  takeFullTour() {
    this.callbacks.takeFullTour = () => {};
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'freshtab',
      action: 'takeFullTour'
    }), '*');
  },

  getUrlbar(value) {
    this.callbacks.getUrlbar = () => {};
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'core',
      action: 'getUrlbar',
      args: [value]
    }), '*');
  },

  revertBack() {
    this.callbacks.revertBack = () => {};
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'freshtab',
      action: 'revertBack'
    }), '*');
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

    return DS.PromiseObject.create({ promise }).then(model => model.speedDials);
  },

  addSpeedDial(item) {
    this.callbacks.addSpeedDial = () => {};

    window.postMessage(JSON.stringify({
      target: "cliqz",
      module: "freshtab",
      action: "addSpeedDial",
      "args": [item]
    }), "*");
  },

  removeSpeedDial(item) {
    this.callbacks.removeSpeedDial = () => {};

    window.postMessage(JSON.stringify({
      target: "cliqz",
      module: "freshtab",
      "action": "removeSpeedDial",
      "args": [item]
    }), "*");
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

    return DS.PromiseObject.create({ promise });
  }
});
