import Ember from "ember";
import News from "../../models/news";
import SpeedDials from "../../models/speed-dials";

var focusTotalTime = 0,
    displayTotalTime = 0,
    start = 0,
    focusStart,
    blurStart = 0,
    focusTime = 0,
    blurCount = 0,
    unloadingStarted = false,
    focus = true;

export default Ember.Route.extend({
  cliqz: Ember.inject.service('cliqz'),

  model() {
    return this.get('cliqz').getSpeedDials().then( speedDials => {
      return Ember.Object.create({
        speedDials: SpeedDials.create({ content: speedDials.map(dial => Ember.Object.create(dial)) }),
        news: News.create({ model: [] })
      });
    })

  },

  afterModel(model) {
    this.get('cliqz').getNotificationsCount().then(counts => {
      const speedDialsDomains = model.get('speedDials').mapBy("displayTitle");
      const sources = Object.keys(counts).filter(source => speedDialsDomains.indexOf(source) !== -1);
      sources.forEach(source => {
        //model.get('speedDials').toArray().forEach(dial => {dial.set("url", "sdasd");console.log(dial.url)})
        const speedDial = model.get('speedDials').toArray().find(dial => dial.get('displayTitle') === source);
        speedDial.set('count', counts[source]);
        //speedDial.set('displayTitle',  22);//counts[source];
        //speedDial.setProperties({ count:  counts[source]})
        //speedDial.setEach('count', 2)
      });
    }).catch(e => console.error("err", e));
return
    this.get('cliqz').getNews().then( news => {
      model.set('news.model', news);
      var historySites = model.getWithDefault("speedDials.history.length", 0) < 5 ? model.get("speedDials.history.length") : 5,
          customSites = model.getWithDefault("speedDials.custom.length", 0),
          self = this;


      this.get('cliqz').getTabIndex().then(function(tabIndex){
        this.get('cliqz').sendTelemetry({
          type: 'home',
          action: 'display',
          historysites: historySites,
          customsites: customSites,
          topnews: model.getWithDefault("news.topNews.length", 0),
          topnews_version: model.get("news.version"),
          yournews: model.getWithDefault("news.yourNews.length", 0),
          tab_index: tabIndex
        });

        start = new Date().getTime();
        focusStart = start;


        window.addEventListener("beforeunload", function() {
          if (unloadingStarted) {
            return;
          } else {
            unloadingStarted = true;
          }
          displayTotalTime = new Date().getTime() - start;
          focusTotalTime += new Date().getTime() - focusStart;
          this.get('cliqz').sendTelemetry({
            type: 'home',
            action: 'hide',
            display_time: displayTotalTime,
            focus_time: focusTotalTime,
            blur_count: blurCount,
            home_id: tabIndex
          });
        }.bind(this), false);

        window.addEventListener('blur', function() {
          focus = false;
          blurStart = new Date().getTime();
          focusTotalTime += blurStart - focusStart;
          focusTime = blurStart - focusStart;
          blurCount++;
          this.get('cliqz').sendTelemetry({
            type: 'home',
            action: 'blur',
            focus_time: focusTime,
            home_id: tabIndex
          });
        }.bind(this));

        this.get('cliqz').sendTelemetry({
          type: 'home',
          action: 'focus',
          home_id: tabIndex
        });

        window.addEventListener('focus', function() {
          if (focus) {
            return;
          }
          focusStart = new Date().getTime();
          this.get('cliqz').sendTelemetry({
            type: 'home',
            action: 'focus',
            home_id: tabIndex
          });
        }.bind(this));

      }.bind(this));
    });
  }
});
