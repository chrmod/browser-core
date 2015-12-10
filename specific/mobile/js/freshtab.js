// CliqzFreshTabNews.getNews().then(function () { console.log("news",arguments); })

function getNews() {
  console.log("Start getting news");
  return CliqzFreshTabNews.getNews().then(function(news) {

    var top_news = news.top_h_news;

    console.log('top news', top_news)
    top_news = top_news.map(function(r){
      var details = CliqzUtils.getDetailsFromUrl(r.url);
      var logo = CliqzUtils.getLogoDetails(details);
      return {
        title: r.title,
        description: r.description,
        short_title: r.short_title,
        displayUrl: details.domain || r.title,
        url: r.url,
        text: logo.text,
        backgroundColor: logo.backgroundColor,
        buttonsClass: logo.buttonsClass,
        style: logo.style
      }
    });
    document.body.innerHTML += topNews(top_news);
//     $('.topNewsLink').on('click', function() {
//       var action = {
//         type: CliqzFreshTab.signalType,
//         action: 'click',
//         target_type: 'topnews',
//         target_index: $(this).attr('data-index')
//       };
//       CliqzUtils.telemetry(action);
//     });
  })
//   .catch(function(reason) {
//     console.log("CliqzFreshTabNews.getNews exception: " + reason);
//   });
}
function init() {
  if(!CliqzHandlebars.tplCache.topnews) return setTimeout(init, 100);
  topNews = CliqzHandlebars.tplCache["topnews"];
  topSites = CliqzHandlebars.tplCache["topsites"];
  getNews();
  osBridge.getTopSites("topSitesDone", 5);
};
var topSitesDone = function (list) {
  list = list.map(function(r){
      var details = CliqzUtils.getDetailsFromUrl(r.url);
      var logo = CliqzUtils.getLogoDetails(details);
      return {
        title: r.title,
        displayUrl: details.domain || r.title,
        url: r.url,
        text: logo.text,
        backgroundColor: logo.backgroundColor,
        buttonsClass: logo.buttonsClass,
        style: logo.style
      }
    });
  document.body.innerHTML += topSites(list);
}

CliqzUtils.getLocalStorage = function(url) {
    return localStorage;
}

var topNews;
window.addEventListener('load', init);

