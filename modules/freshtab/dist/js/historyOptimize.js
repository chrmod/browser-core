Components.utils.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');

$(document).ready(function() {
  var topVisited = Handlebars.compile($("#top").html());

  var ONE_DAY = 24 * 60 * 60 * 1000, //ms
      ONE_MONTH = 30 * ONE_DAY;

  function getDomainData(startDate){
    var domains = {}, domains_array = []
    return new Promise(function(resolve, reject){
      CliqzHistoryManager.PlacesInterestsStorage
          ._execute(
              "SELECT url, visit_count, title from moz_places WHERE hidden = 0 AND visit_count > 1 and last_visit_date > " + (startDate * 1000) /* microseconds */,
              ["url", "visit_count", "title"],
              function(result) {
                  var key = CliqzUtils.getDetailsFromUrl(result.url).host;
                  domains[key] = domains[key] || {url:[], visits:0, key: key};
                  domains[key].url.push(result);
                  domains[key].visits += result.visit_count;
                  domains[key].ratio = domains[key].url.length / domains[key].visits;
              }
          )
          .then(function() {
              for(var k in domains) domains_array.push(domains[k]);

              domains_array.sort(function(i, j){
                  return i.visits < j.visits;
              })

              resolve({
                dict: domains,
                array: domains_array
              });
      });
    });
  }


  function compute(domain){
    // enhance domain - create some new fields which will be used later
    domain.forEach(function(visit){
        visit.cleanUrl = visit.url.split('://')[1]
        if(visit.cleanUrl[visit.cleanUrl.length-1] == '/')
            visit.cleanUrl = visit.cleanUrl.slice(0, -1);

        visit.megaCleanUrl = visit.cleanUrl.split(/\?|#/)[0]
    });

    // create totals score
    domain.forEach(function(visit1){
        visit1.totals = 1;
        domain.forEach(function(visit2){
            if(visit2.cleanUrl.indexOf(visit1.cleanUrl) == 0 && visit1.cleanUrl != visit2.cleanUrl){
                visit1.totals++;
            }
        });
    })

    //sort by totals
    domain = domain.sort(function(i, j){
        return i.totals < j.totals;
    });

    // flag duplicates and move the counts to the url which remains
    for(var i=0; i<domain.length; i++){
        for(var j=i+1; j<domain.length; j++){
            if(i!=j && domain[i].megaCleanUrl == domain[j].megaCleanUrl){
                domain[i].visits += domain[j].visits
                domain[j].hide = true;
            }
        }
    }

    // flag urls which are "not important" for the selected domain
    var filtered = domain.filter(function(e){
        var ok = e.totals > domain.length/200;
        if(!ok)e.hide = true;

        return !e.hide;
        //return true; // for now dont hide anything - just flag
    });

    return filtered;
  }

  // gets the top X urls from Y domains
  function getTop(domain, domainNo, urlNo, scoreFactor){
    return domain.array.slice(0, domainNo).map(function(domain, idx, arr){
            var top = compute(domain.url).slice(0, urlNo);
            //TODO - schange this if urlNo > 1
            top[0].score = (arr.length - idx) * scoreFactor;
            return top[0];
    });
  }


  function fresh(){
    return new Promise(function(resolve, reject){
      //get data for 1,3 and 6 months
      Promise.all([
                    getDomainData((new Date()).getTime() - ONE_MONTH*1),
                    getDomainData((new Date()).getTime() - ONE_MONTH*3),
                    //getDomainData((new Date()).getTime() - ONE_MONTH*6),
                  ])
        .then(function(results){
          //reduce it to one array

          var joined = results.reduce(function(prev, current, idx){
            var r = getTop(current, 7, 1, 100 - idx * 30);
            return prev.concat(r)
          }, []);

          joined = joined.reduce(function(prev, current, idx, array){
            var elem = prev.find(function(r){ return r.megaCleanUrl == current.megaCleanUrl; });
            if(!elem)
              prev.push(current);
            else {
              elem.score += current.score;
            }
            return prev
          }, []);

          joined.sort(function(a, b){
            return a.score < b.score;
          });
          return resolve(joined);
        }
      ).catch(function(){
      });
    });
  }


  fresh().then(function(results){
    //HERE are the results
    var results = results.slice(0, 5).map(function(r){
      return {
        title: r.title,
        url: r.url,
        displayTitle: CliqzUtils.getDetailsFromUrl(r.url).domain ? CliqzUtils.getDetailsFromUrl(r.url).domain : r.title,
        logo: CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(r.url))
      }
    });
    //var results = {}
    console.log('DONE', results);
    document.getElementById('topVisited').innerHTML = topVisited(results);

  }).catch(function(results){
    console.log('err', arguments);
  });
});
