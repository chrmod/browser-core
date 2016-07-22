import Ember from 'ember';

export default Ember.Component.extend({
  type: Ember.computed("model.yourNews.length", function (){
    if (this.get("model.yourNews.length") > 0 ) {
      return "yournews";
    } else {
      return "topnews";
    }
  }),

  news: Ember.computed("type", function () {
    const type = this.get("type");
    if (type === "yournews") {
      return this.get("model.yourNews");
    } else {
      return this.get("model.topNews");
    }
  })
});
