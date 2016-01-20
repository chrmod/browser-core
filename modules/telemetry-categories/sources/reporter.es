import DATA from 'telemetry-categories/categories';
import { utils } from 'core/cliqz';

Components.utils.import('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');

function log(s){
	utils.log(s, 'CATEGORIES')
}

const ONE_DAY = 24 * 60 * 60 * 1000,
      ONE_MONTH = 30 * ONE_DAY,
      SEND_INTERVAL = 20 * 60 * 1000; //20 minutes

export default class {

  constructor() {
    // timers
    this.t0 = this.tH = this.tD = null;
  }

  start() {
		this.sendData();
		//wait 5 minutes to do this operation
		this.t0 = utils.setTimeout(this.sendHistoricalData, 5 * 60 *1000)

		log('init');
  }

  stop() {
		this.sendData();
		utils.clearTimeout(this.t0);
		utils.clearTimeout(this.tH);
		utils.clearTimeout(this.tD);

		log('unloaded');
  }

  assess(url) {
    var u = utils.getDetailsFromUrl(url), tests = {};
    tests[u.host] = true;
    tests[u.domain] = true;
    //we can add more tests, eg - with path

    for(var k in tests){
        var c = DATA[utils.hash(k)];
        if(c){
            var t = JSON.parse(utils.getPref('cat', '{}'))
            t[c] = t[c] || { v:0, d:0 };
            if(t[c].d + 1000 < Date.now()){ //only update if the last update was more than 1 second ago
                t[c].v++;
                t[c].d = Date.now();
                utils.setPref('cat', JSON.stringify(t))
            }

            log(JSON.stringify(t));
        }
    }
  }

  sendData(){
    log('send DATA');

    var data = JSON.parse(utils.getPref('cat', '{}'));
    if(Object.keys(data).length !== 0){
      var action = {
        type: 'cat',
        data: data
      };
      utils.setPref('cat', '{}');

      utils.telemetry(action);
    }

    this.tD = utils.setTimeout(this.sendData, SEND_INTERVAL)
  }

  sendHistoricalData(){
    log('send HISTORY');

    var start = Date.now(), t = {};
    //send the signal maximum 1 time per day
    if(parseInt(utils.getPref('catHistoryTime', '0')) + ONE_DAY < start){
      utils.setPref('catHistoryTime', ''+start);

      CliqzHistoryManager.PlacesInterestsStorage._execute(
          'SELECT * FROM moz_places WHERE last_visit_date>:date',
          ['url', 'last_visit_date', 'visit_count'],
          function onRow(r){
              var u = utils.getDetailsFromUrl(r.url), tests = {};
              tests[u.host] = true;
              tests[u.domain] = true;
              //we can add more tests, eg - with path

              for(var k in tests){
                  var c = DATA[utils.hash(k)];
                  if(c){
                      t[c] = t[c] || {v:0, u:0, d:0}
                      t[c].u++;
                      t[c].v += r.visit_count;
                      t[c].d = t[c].d < r.last_visit_date ? r.last_visit_date : t[c].d;
                  }
              }
          },
          {
            date: (Date.now() - ONE_MONTH) * 1000
          }).then(function() {
            var action = {
              type: 'cat_history',
              data: t,
              duration: Date.now()-start
            };

            utils.telemetry(action);
          });
    }

    this.tH = utils.setTimeout(this.sendHistoricalData, 60 * 60 * 1000)
  }
}
