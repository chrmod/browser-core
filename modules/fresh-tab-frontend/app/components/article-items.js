import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),
  pageNum: 0,
  maxHeight: 0,

  isOnePage: Ember.computed.equal("pages.length", 1),

  page: Ember.computed('pages.[]', 'pageNum', function () {
    return this.get('pages')[this.get("pageNum")];
  }),

  pages: Ember.computed('model.[]', 'pageSize', function () {
    const pageSize = this.get('pageSize');
    const model = this.get("model").toArray();

    const ret = [];

    while (model.length > 0) {
      ret.push(model.splice(0, pageSize));
    }
    return ret;
  }),


  nextPage() {
    const pageNum = this.get("pageNum");
    if (pageNum + 1 === this.get("pages.length") ) {
      this.set('pageNum', 0);
    } else {
      this.set('pageNum', this.get('pageNum') + 1);
    }
  },

  autoRotate: function () {
    if (this.get("pageSize") === this.get("model.length")) {
      return;
    }
    Ember.run.cancel(this.get("timer"));
    this.set('timer', Ember.run.later( () => {
      this.animate(function() {
        this.nextPage();
      }.bind(this));
      this.autoRotate();
    }, 15000));
  }.on('didInsertElement'),

  actions: {

    next() {
      this.nextPage();
    },

    setPage(num) {
      this.animate(function() {
        this.set('pageNum', num);
      }.bind(this));
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'topnews-pagination-dots',
        target_index: num
      });
      this.autoRotate();
     },

     calculateHeight(height) {

      var height = height.slice(0, height.length -2),
          maxHeight = this.get('maxHeight'),
          $newsItems = $('#newsContainer li');
      if(height > maxHeight) {
        maxHeight = height;
        height = parseInt(height, 10) + 10;
        this.set('maxHeight', height);
      }
      $newsItems.each(function(key, item) {
        $(item).css('height', maxHeight);
      })
     }
  },

  animate: function(setNextPage) {
    //stop rotation on hover
    if(this.$('.topnews:hover') && this.$('.topnews:hover').length ===0 ) {
      this.$().find('.content').fadeOut(function() {
        setNextPage();
      }).fadeIn();
    }
  }

});
