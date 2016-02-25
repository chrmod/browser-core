function renderNews(news) {
  var hb_news = news.hb_news,
      top_news = news.top_h_news,
      topNews  = CliqzHandlebars.compile($('#topNews').html()),
      yourNews = CliqzHandlebars.compile($('#yourNews').html()),
      underline = CliqzUtils.getPref('freshTabNewsUnderline'),
      newsEmail = CliqzUtils.getPref('freshTabNewsEmail'),
      startEnter,
      elapsed,
      onlyTopNews = true,
      hbNewsAll = [],
      hbNewsData = {};
  if (hbNews) {
    log(hbNews)
    Object.keys(hbNews).forEach(function(domain) {
      hbNews[domain].forEach(function(r) {
        hbNewsAll.push({
          title: r.title,
          displayUrl: CliqzUtils.getDetailsFromUrl(r.url).domain || r.title,
          logo: CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(r.url)),
          url: r.url,
          underline: underline
        });
      });
    });
    log("Personalized news", hb_news);
    onlyTopNews = false;
    hbNewsData['newsEmail'] = newsEmail;
    if(newsEmail) {
      $('.wrap').addClass('newsEmail');
    }
    hbNewsData['hbNews'] = hbNewsAll;
    document.getElementById('yourNewsBox').innerHTML = yourNewsTpl(hbNewsData);
  } else {
    $('.newsBox').addClass('onlyTopNews');
  }
  log('top news', top_news);
  top_news = top_news.map(function(r){
    return {
      title: r.title,
      short_title: r.short_title,
      displayUrl: CliqzUtils.getDetailsFromUrl(r.url).domain || r.title,
      url: r.url,
      logo: CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(r.url)),
      onlyTopNews: onlyTopNews,
      underline: underline
    };
  });
  document.getElementById('topNewsBox').innerHTML = topNews(top_news);
  Slider.init({
    totalNews: $("#topNewsBox li").length,
    el: $("#topNewsBox li")
  });

  $('.subscribe').on('click', function(e){
    CliqzUtils.telemetry({
      type: 'home',
      action: 'click',
      target_type: 'newsEmail',
      });
  });

  $('.news').on('click', function(e) {
      CliqzUtils.telemetry({
        type: 'home',
        action: 'click',
        target_type: e.currentTarget.className.indexOf('topnews') > -1 ? 'topnews' : 'yournews',
        extra: e.target.getAttribute('extra'),
        target_index: $(this).attr('data-index')
      });
  });

  $('.news').on('mouseenter', '.logo, .title, .url', function(e) {
    startEnter = new Date().getTime();
    /*if(e.delegateTarget.className.indexOf('topnews') > -1) {
      Slider.pause();
    }*/
  });

  $('.news').on('mouseleave', '.logo, .title, .url', function(e) {
    elapsed = new Date().getTime() - startEnter;
    /*if(e.delegateTarget.className.indexOf('topnews') > -1) {
      Slider.resume();
    }*/

    if(elapsed > 2000) {
      CliqzUtils.telemetry({
        type: 'home',
        action: 'hover',
        target_type: e.delegateTarget.className.indexOf('topnews') > -1 ? 'topnews' : 'yournews',
        extra: e.target.getAttribute('class'),
        hover_time: elapsed,
        target_index: e.delegateTarget.getAttribute('data-index')
      });
    }
  });
}
