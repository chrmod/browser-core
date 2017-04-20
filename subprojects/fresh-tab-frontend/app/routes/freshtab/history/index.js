import Ember from "ember";

const VisitsProxy = Ember.ArrayProxy.extend({
  setup: function () {
    this.setProperties({
      isLoading: false,
      hasMoreResults: true,
      content: [],
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
    this.set('isLoading', true);
    const history = this.get('history');

    return history.search(query, from, to).then(({sessions, history}) => {
      this.get('content').addObjects(sessions);
      return history;
    }).then(history => {
      this.setProperties({
        hasMoreResults: history.totalUrlCount !== 0,
        isLoading: false,
        currentFrom: history.frameStartsAt,
      });
    });
  },
});

export default Ember.Route.extend({
  historySync: Ember.inject.service('history-sync'),
  cliqz: Ember.inject.service(),

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
    document.title = "History"
  },

  deactivate() {
     document.title = this.get('previousTitle');
  },

  model({ query, from, to }) {
    const history = this.get('historySync');
    const model = VisitsProxy.create({
      history,
      query,
      from,
      to,
    });
    model.load();
    return model;
  },
  actions: {
    delete() {
      this.get('cliqz').showHistoryDeletionPopup();
    }
  }

});

