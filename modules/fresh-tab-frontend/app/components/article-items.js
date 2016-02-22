import Ember from 'ember';

export default Ember.Component.extend({
  pageNum: 0,

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
      this.nextPage();
      this.autoRotate();
    }, 15000));
  }.on('didInsertElement'),

  /*autoRotate: function () {
    Ember.run.later( () => {
      this.nextPage();
      this.autoRotate();
    }, 2000)
  }.on('didInsertElement'),*/

  actions: {
    next() {
      this.nextPage();
    },

    setPage(num) {
      this.set("pageNum", num);
      this.autoRotate();
     }
  }

});
