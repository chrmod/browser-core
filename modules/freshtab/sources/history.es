var CliqzFreshTabHistory = {
  /**
   * Returns the array of top visited URLs with their titles and number of visits
   * @param {Number} limit of results
   * @returns {Array} Array of objects { url, title, total_count }
   */
  getTopUrls(limit) {
    var result = [], domains = {};
    return new Promise(function(resolve, reject){
      Components.utils.import('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');

      CliqzHistoryManager.PlacesInterestsStorage._execute(
        [
          "select mzh.url as url, mzh.title as title, sum(mzh.days_count) as total_count",
          "from (",
            "select moz_places.url, moz_places.title, moz_places.rev_host, moz_historyvisits.*,",
                   "(moz_historyvisits.visit_date /(86400* 1000000) - (strftime('%s', date('now', '-6 months'))/86400) ) as days_count",
            "from moz_historyvisits, moz_places",
            "where moz_places.typed == 1",
                  "and moz_historyvisits.visit_date > (strftime('%s', date('now', '-6 months'))*1000000)",
                  "and moz_historyvisits.place_id == moz_places.id",
                  "and moz_places.hidden == 0",
                  "and moz_historyvisits.visit_type < 4",
          ") as mzh",
          "group by mzh.place_id",
          "order by total_count desc",
          "limit 15",
        ].join(' '),
        ["url", "title", "total_count"],
        function(row) {
          var key = CliqzUtils.getDetailsFromUrl(row.url).host;
          if (!(key in domains)){
            result.push(row);
            domains[key]=row;
          }
        }
      ).then(function() {
        resolve(result);
        //resolve(result.slice(0,limit));
      });
    });
  }
};

export default CliqzFreshTabHistory;
