import Ember from "ember";
import News from "../models/news";

export default Ember.Route.extend({
  cliqz: Ember.inject.service('cliqz'),

  model() {
    return Ember.RSVP.hash({
      speedDials: this.get('cliqz').getSpeedDials(),
      news: this.get('cliqz').getNews(),
      customDials: [1,2, 4]
    }).then(model => {
      model.news = News.create({model: model.news});
      return model;
    });
  },

  afterModel(model) {
    var yourNews = model.news.get('yourNews'),
        topNews = model.news.get('topNews');
    //console.log(model.news, "telemetry")
    //console.log("!!!!", model)
    this.get('cliqz').sendTelemetry({
      type: 'home',
      action: 'display',
      topsites: model.speedDials && model.speedDials.length || 0,
      topnews: topNews && topNews.length || 0,
      topnews_version: model.news.get("version"),
      yournews: yourNews && yourNews.length || 0,
    });
  }
});
