import Ember from "ember";

const VisitsProxy = Ember.ArrayProxy.extend({
  setup: function () {
    this.setProperties({
      isLoading: false,
      hasMoreResults: true,
      content: [],
      sectionCount: 0,
    });
  }.on('init'),

  load() {
    return this.__load({ query: this.get('query'), from: this.get('from'), to: this.get('to') });
  },

  loadMore() {
    if (this.get('isLoading') || !this.get('hasMoreResults') || (this.get('currentFrom') <= this.get('from'))) {
      return;
    }
    return this.__load({ query: this.get('query'), to: this.get('currentFrom'), from: this.get('from') });
  },

  __load({ query, from, to }) {
    this.startLoadingAt = new Date();
    this.set('isLoading', true);
    const history = this.get('history');

    return history.search(query, from, to).then(({sessions, history}) => {
      this.get('content').addObjects(sessions);
      this.set('sectionCount', this.get('sectionCount') + sessions.length);
      return history;
    }).then(history => {
      this.setProperties({
        hasMoreResults: history.totalUrlCount !== 0,
        isLoading: false,
        currentFrom: history.frameStartsAt,
      });

      this.get('cliqz').sendTelemetry({
        type: 'history',
        action: 'update',
        section_count: this.get('sectionCount'),
        load_duration: new Date() - this.startLoadingAt
      });
    });
  },
});

export default Ember.Route.extend({
  historySync: Ember.inject.service('history-sync'),
  cliqz: Ember.inject.service(),
  i18n: Ember.inject.service(),

  queryParams: {
    query: {
      refreshModel: true,
    },
    from: {
      refreshModel: true,
    },
    to: {
      refreshModel: true,
    }
  },

  activate() {
    this.set('previousTitle', document.title);
    document.title = this.get('i18n').t('history.tab-title');
  },

  deactivate() {
     document.title = this.get('previousTitle');
  },

  model({ query, from, to }) {
    const history = this.get('historySync');
    const cliqz = this.get('cliqz');
    const model = VisitsProxy.create({
      history,
      query,
      from,
      to,
      cliqz, // TODO: @mai not sure if passing cliqz through this Proxy is a good idea or not. Can we get it somehow from the cliqz.js?
    });
    model.load();
    return model;
  },
  afterModel() {
    this.get('cliqz').sendTelemetry({
      type: 'history',
      action: 'show',
    });
  },
  actions: {
    delete() {
      this.get('cliqz').showHistoryDeletionPopup();
      this.get('cliqz').sendTelemetry({
        type: 'history',
        view: 'sections',
        action: 'click',
        target: 'clear_recent'
      });
    },
    sendTelemetry(name) {
      switch(name) {
        case 'home-click-history':
          this.get('cliqz').sendTelemetry({
            type: 'home',
            action: 'click',
            target: 'history'
          });
          break;
        case 'all':
        case 'today':
        case 'yesterday':
        case 'past_week':
          this.get('cliqz').sendTelemetry({
            type: 'history',
            view: 'sections',
            action: 'click',
            target: 'filter',
            state: name
          });
          break;
      }
    }
  }
});

