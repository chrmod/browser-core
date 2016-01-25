function renderNews(news) {
  var hb_news = news.hb_news,
      top_news = news.top_h_news,
      topNews  = CliqzHandlebars.compile($("#topNews").html()),
      yourNews = CliqzHandlebars.compile($("#yourNews").html()),
      startEnter,
      elapsed,
      extra;

  if (hb_news) {
    for (var domain in hb_news) {
      hb_news[domain].logo = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(hb_news[domain][0].url))
    }
    log("Personalized news", hb_news)
    document.getElementById('yourNewsBox').innerHTML = yourNews(hb_news);
  } else {
    $('.newsBox').addClass('onlyTopNews');
  }
  log('top news', top_news)
  top_news = top_news.map(function(r){
    return {
      title: r.title,
      short_title: r.short_title,
      displayUrl: CliqzUtils.getDetailsFromUrl(r.url).domain || r.title,
      url: r.url
    }
  });
  document.getElementById('topNewsBox').innerHTML = topNews(top_news);
  Slider.init({
    "totalNews": $(".onlyTopNews li").length
  });
  $('.topNewsLink').on('click', function(e) {
    CliqzUtils.telemetry({
      type: 'home',
      action: 'click',
      target_type: 'topnews',
      extra: e.target.getAttribute('extra'),
      target_index: $(this).attr('data-index')
    });
  });

  $('.topNewsLink').on('mouseenter', '.title, .url', function(e) {
    if( e.target.getAttribute('class') === 'title') {
      extra = 'title';
    } else {
      extra = 'url';
    }
    startEnter = new Date().getTime();
  });

  $('.topNewsLink').on('mouseleave', '.title, .url', function(e) {
    elapsed = new Date().getTime() - startEnter;
    if(elapsed > 2000) {
      CliqzUtils.telemetry({
        type: 'home',
        action: 'hover',
        target_type: 'topnews',
        extra: extra,
        hover_time: elapsed,
        target_index: $(this).attr('data-index')
      });
    }
  });
}
