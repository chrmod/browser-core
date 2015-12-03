Components.utils.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');
Components.utils.import('chrome://cliqzmodules/content/FreshTab.jsm');

$(document).ready(function() {
  var topVisited = CliqzHandlebars.compile($("#top").html());
  function getDomainData(){
    var result = []
    return new Promise(function(resolve, reject){
      CliqzHistoryManager.PlacesInterestsStorage
          ._execute(
            "select mzh.url as url, mzh.title as title, sum(mzh.days_count) as total_count from ( select moz_places.url, moz_places.title, moz_places.rev_host, moz_historyvisits.*, (moz_historyvisits.visit_date /(86400* 1000000) - (strftime('%s', date('now', '-6 months'))/86400) )  as days_count from moz_historyvisits, moz_places where moz_places.typed == 1  and moz_historyvisits.visit_date >  (strftime('%s', date('now', '-6 months'))*1000000) and moz_historyvisits.place_id ==  moz_places.id and moz_places.hidden == 0 and moz_historyvisits.visit_type== 2 and moz_historyvisits.from_visit == 0) as mzh group by mzh.place_id  order by total_count desc limit 5",
            ["url", "title", "total_count"],
            function(row) {
              result.push(row);
            }
          )
          .then(function() {
              resolve(result);
          });
    });
  }

  getDomainData().then(function(results){
    var results = results.map(function(r){
      return {
        title: r.title,
        url: r.url,
        displayTitle: (CliqzUtils.getDetailsFromUrl(r.url).cleanHost || CliqzUtils.getDetailsFromUrl(r.url).friendly_url)  || r.title,
        logo: CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(r.url))
      }
    });

    document.getElementById('topVisited').innerHTML = topVisited(results);

    $('.historyLink').on('click', function() {
      var action = {
        type: FreshTab.signalType,
        action: 'click',
        target_type: 'topsites',
        target_index: $(this).attr('data-index')
      };
      CliqzUtils.telemetry(action);
    });

  }).catch(function(results){
    console.log('err', arguments);
  });
});
