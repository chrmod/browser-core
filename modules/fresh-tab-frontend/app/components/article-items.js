import Ember from 'ember';

export default Ember.Component.extend({
  pageNum: 0,

  page: Ember.computed('model', 'pageNum', 'pageSize', function () {
    const articles = this.get('model');
    const count = articles.length;
    const offset = this.get('pageNum') * this.get('pageSize')
    console.log("offset", offset)
    return articles.slice(offset, offset + this.get('pageSize') || articles.length)
  }),

  nextPage() {
    this.set('pageNum', this.get('pageNum') + 1)
  },

  /*autoRotate: function () {
    Ember.run.later( () => {
      this.nextPage();
      this.autoRotate();
    }, 2000)
  }.on('didInsertElement'),*/

  actions: {
    next() {
      this.nextPage();
    }
  }

});
