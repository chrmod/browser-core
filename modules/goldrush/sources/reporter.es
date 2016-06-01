/*
*
*  Gets an idea of the categories a user is interested in.
*  Categories are lists of domains and we should never aggregate very specifically to avoid privacy issues
*  eg:  - one category can be shopping and the domains: amazon, ebay, zalando, ...
*       - we will only send to the backend information related with the category and not with any particular domain
*
*/


import { utils } from 'core/cliqz';
import { readFile } from 'core/fs';

Components.utils.import('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');

function log(s){
	utils.log(s, 'GOLDRUSH - Reporter');
}

export default class {

  constructor(categories) {
    log('reporter created');
  }

  start() {
    //this.sendData();
    //wait 5 minutes to do this operation
    //this.t0 = utils.setTimeout(this.sendHistoricalData.bind(this), 5 * 60 *1000)

    log('reporter started');

    CliqzHistoryManager.PlacesInterestsStorage._execute(
          'SELECT * FROM moz_places WHERE last_visit_date>:date',
          ['url', 'last_visit_date', 'visit_count'],
          function onRow(r){
              var u = utils.getDetailsFromUrl(r.url), tests = {};
              tests[u.host] = true;
              tests[u.domain] = true;
              //we can add more tests, eg - with path
              log('url data: ' + u.host + ' - ' + u.domain + ' - date: ' + r.last_visit_date);

          }.bind(this),
          {
            date: (Date.now() - (24 * 60 * 60 * 1000 * 30)) * 1000
          }).then(function() {

            log('action here ');
          });
  }

  stop() {
		log('reporter unloaded');
  }

  updateCategories( categories ) {
    log('update categories');
  }

  assess(url) {
    var u = utils.getDetailsFromUrl(url), tests = {};
    tests[u.host] = true;
    tests[u.domain] = true;
    //we can add more tests, eg - with path

    log('asses called with url' + url);
    /*
    for(var k in tests){
        // only aggregate on category level to avoid privacy leaks !!
        var c = this.categories[utils.hash(k)];
        if(c){
            var t = JSON.parse(utils.getPref('cat', '{}'))
            t[c] = t[c] || { v:0, d:0 };
            if(t[c].d + 5000 < Date.now()){ //only update if the last update was more than 5 seconds ago
                t[c].v++;
                t[c].d = Date.now();
                utils.setPref('cat', JSON.stringify(t))
            }

            log(JSON.stringify(t));
        }
    }*/
  }

  sendData(){
    log('send data');
  }

  sendHistoricalData(){

  }
}
