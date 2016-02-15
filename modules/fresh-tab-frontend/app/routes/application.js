import Ember from "ember";

export default Ember.Route.extend({
  cliqz: Ember.inject.service(),
  i18n: Ember.inject.service(),

  beforeModel() {
    return this.get('cliqz').getConfig().then( config => {
      this.set('config', config);
      this.set('i18n.locale', config.locale);
    });
  },

  model: function() {
    const config = this.get('config');
    return Ember.Object.create({
      miniOnboarding: config.miniOnboarding
    });
  },

  afterModel() {
    const config = this.get('config');

    if (config.showOnboarding) {
      Ember.run.later(this.send.bind(this, 'openModal', 'onboarding'), 1000);
    }
  },

  actions: {

    openLink(url, telemetry) {
      this.get('cliqz').sendTelemetry({
        "type": "onboarding",
        "product": "cliqz",
        "action": "click",
        "action_target": telemetry,
        "version": 1.0,
      });
      window.open(url,'_blank');
    },

    openModal(modalName) {
      if (modalName === "onboarding") {
        //this.get('cliqz').setCliqzOnboarding();
        this.get('cliqz').sendTelemetry({
          type: "onboarding",
          product: "cliqz",
          action: "show",
          version: "1.0"
        });
      }

      return this.render(modalName, {
        into: "application",
        outlet: "modal"
      });
    },

    closeModal() {
      this.get('cliqz').sendTelemetry({
        type: "onboarding",
        product: "cliqz",
        action: "click",
        action_target: "confirm",
        version: "1.0"
      });

      return this.disconnectOutlet({
        outlet: "modal",
        parentView: "application"
      });
    },

    fullTour() {
      this.get('cliqz').takeFullTour();
    },

    freshTabLearnMore(url) {
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'onboarding_more'
      });
      window.open(url,'_blank');
    },

    revertBack() {
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'onboarding_revert'
      });

      this.get('cliqz').revertBack();

      try{
        window.location = 'about:home';
      } catch(e){
        window.location = 'about:blank';
      }
    }
  },
});
