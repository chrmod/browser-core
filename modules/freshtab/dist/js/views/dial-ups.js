function renderDialUps(results) {
  var topVisited = CliqzHandlebars.compile($("#dial-ups").html());
    var results = results.map(function(r){
      var details = CliqzUtils.getDetailsFromUrl(r.url);
      return {
        title: r.title,
        url: r.url,
        displayTitle: details.cleanHost || details.friendly_url || r.title,
        logo: CliqzUtils.getLogoDetails(details)
      }
    });

    document.querySelector('#topVisited').innerHTML = topVisited(results);

    $('.historyLink').on('click', function() {
      telemetry({
        action: 'click',
        target_type: 'topsites',
        target_index: this.dataset.index
      });
    });
};
