import Ember from 'ember';

export default Ember.Component.extend({
  isUnderlined: Ember.computed.alias('model.underline'),
  classNameBindings: ['isUnderlined:underline'],
  cliqz: Ember.inject.service(),

  click(ev) {
    this.get('cliqz').sendTelemetry({
      type: 'home',
      action: 'click',
      target_type: this.get('target-type'),
      extra: Ember.$(ev.target).attr('extra'),
      target_index: this.get('index')
    });
  }
});
