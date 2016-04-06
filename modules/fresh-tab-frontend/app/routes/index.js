import Ember from "ember";
import News from "../models/news";
import SpeedDials from "../models/speed-dials";

export default Ember.Route.extend({
  cliqz: Ember.inject.service('cliqz'),

  model() {
    return this.get('cliqz').getSpeedDials().then( speedDials => {
      return Ember.Object.create({
        speedDials: SpeedDials.create({ content: speedDials }),
        news: News.create({ model: [] })
      });
    })

  },

  afterModel(model) {
    this.get('cliqz').getNews().then( news => {
      model.set('news.model', news);
      var historySites = model.getWithDefault("speedDials.history.length", 0) < 5 ? model.get("speedDials.history.length") : 5,
          customSites = model.getWithDefault("speedDials.custom.length", 0);

      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'display',
        historysites: historySites,
        customsites: customSites,
        topnews: model.getWithDefault("news.topNews.length", 0),
        topnews_version: model.get("news.version"),
        yournews: model.getWithDefault("news.yourNews.length", 0),
      });
    });
  }
});
