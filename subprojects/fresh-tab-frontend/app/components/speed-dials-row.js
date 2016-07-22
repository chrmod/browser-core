import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service('cliqz'),

  setup: function () {
    this.setProperties({
      limit: 5,
      removedSpeedDials: []
    })
  }.on("init"),

  displayAddBtn: Ember.computed.lt('speedDials.length', 5),

  displayHistoryLabel: Ember.computed('speedDials.length', 'removedSpeedDials.length', function() {
    return this.get('speedDials.length') > 0 || this.get('removedSpeedDials.length') > 0
  }),

  isCustom: Ember.computed.equal("type", "custom"),

  speedDials: Ember.computed('model.content.[]', 'isCustom', 'limit', function () {
    return this.get("model.content")
      .filterBy("custom", this.get("isCustom"))
      .slice(0, this.get("limit"));
  }),

  manyRemoved: Ember.computed.gt('removedSpeedDials.length', 1),

  actions: {
    addToCustom(speedDial) {
      this.get("model").pushObject(speedDial);
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'add-customsite'
      });
      this.set('removedSpeedDials', []);
    },

    reAddSpeedDial(absIndex, relIndex, url) {
      this.get('cliqz').addSpeedDial(url, relIndex).then((obj) => {
        const model = this.get('model');
        model.insertAt(absIndex, Ember.Object.create(obj));
      });
    },

    remove(speedDial) {
      speedDial.setProperties({
        absRemovedAt: this.get("model").indexOf(speedDial),
        relRemovedAt: this.get("speedDials").indexOf(speedDial),
      });


      const removeList = this.get("removedSpeedDials");
      const type = speedDial.get("custom") ? "custom" : "history";

      let originalList;
      if(speedDial.get("custom")) {
        originalList = this.get("model.custom");
      } else {
        originalList = this.get("model.history");
      }
      removeList.pushObject(speedDial)
      const index = originalList.indexOf(speedDial);

      this.get("model.content").removeObject(speedDial);
      this.get('cliqz').removeSpeedDial(speedDial);

      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'remove-' + type,
        target_index: index
      });
    },

    closeUndo(type, forceClose) {
      this.set('removedSpeedDials', []);
      if(type !== undefined && !forceClose) {
        this.get('cliqz').sendTelemetry({
          type: 'home',
          action: 'click',
          target_type: 'close-history-undo'
        });
      }
    },

    undoRemoval() {
      const speedDial = this.get('removedSpeedDials').popObject();
      const type = this.get("isCustom") ? 'custom' : 'history';

      if(this.get("isCustom")) {
        this.actions.reAddSpeedDial.call(this,
          speedDial.get("absRemovedAt"),
          speedDial.get("relRemovedAt"),
          speedDial.get("url")
        );
      } else {
        this.get('cliqz').revertHistorySpeedDial(speedDial.get("url"));
        this.get('model').insertAt(speedDial.get("absRemovedAt"), Ember.Object.create(speedDial));
      }

      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'undo-' + type + '-remove'
      });
    },

    resetAll() {
      this.get('cliqz').resetAllHistory().then(results => {
        this.set('model.content', results.map( dial => Ember.Object.create(dial) ))
        this.actions.closeUndo.call(this, 'history', true);
      });

      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'reset-all-history'
      });
    }
  }
});
