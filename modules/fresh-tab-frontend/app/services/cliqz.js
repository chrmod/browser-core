import Ember from 'ember';
import DS from 'ember-data';

export default Ember.Service.extend({
  init() {
    this._super(...arguments);

    this.callbacks = Object.create(null);

    window.addEventListener("message", ev => {
      console.log("XXXXXXXXXXXXXXXXXXXXXXXX");

      let message = {};

      try {
        message = JSON.parse(ev.data);
      } catch (e) {
        // non CLIQZ or invalid message should be ignored
      }

      if (message.type === "response") {
        console.log("RESPONSE");
        this.callbacks.getSpeedDials.call(null, message.response);
      }
    });
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
  }
});
