
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var EXPORTED_SYMBOLS = ['CliqzBundesliga'];

var CliqzBundesliga = {
    get: function(q, callback){
        var BUNDESLIGA_API =  'http://cliqz-sports-machine-694310630.us-east-1.elb.amazonaws.com/api/v1/results';
        CliqzUtils.httpHandler('GET', BUNDESLIGA_API, function (res) {
            var data = JSON.parse(res.response);
            var result = Result.generic(Result.CLIQZB, "", null, "", "", null,
                {
                    hide: data.results.length ? false : true,
                    results: data.results
                });
            callback([result], q);
            CliqzUtils.log(JSON.stringify(data.results), 'BUNDESLIGA');
        });
    },
    isBundesligaSearch: function(q){
        return /liveticker|bundesliga|ergebnis|fu\u00DFball|fussball|liga|topspiel|spieltag|kellerduell|ergebnisse/i.test(q)
    }
}
