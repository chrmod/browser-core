
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var EXPORTED_SYMBOLS = ['CliqzBundesliga'];

var CliqzBundesliga = {
    get: function(q, callback){
        var originalQ = q;
        var result = Result.generic(
            Result.CLIQZB,
            "",
            null,
            "ff",
            "",
            null,
            {   hide: false,
                results:[
                {
                    home: { name: 'Bayern', score: '0', short: 'FCB'},
                    away: { name: 'Dortmund', score: '1', short: 'BVB'},
                    started: true
                 },
                {
                    home: { name: 'Koln', score: '5', short: 'KOE'},
                    away: { name: "Schalke", score: '9', short: 'S04'},
                    started: true
                },
                {
                    home: { name: 'Koln', score: '5', short: 'KOE'},
                    away: { name: "Schalke", score: '9', short: 'S04'},
                    started: false,
                    time: "16:45"
                },
                {
                    home: { name: 'Bayern', score: '0', short: 'FCB'},
                    away: { name: 'Dortmund', score: '1', short: 'BVB'},
                    started: true
                 },
                {
                    home: { name: 'Koln', score: '5', short: 'KOE'},
                    away: { name: "Schalke", score: '9', short: 'S04'},
                    started: true
                },
                {
                    home: { name: 'Koln', score: '5', short: 'KOE'},
                    away: { name: "Schalke", score: '9', short: 'S04'},
                    started: false,
                    time: "16:45"
                }
                ]}
        );
        callback([result], originalQ)
    },
    isBundesligaSearch: function(q){
        return /liveticker|bundesliga|ergebnis|fußball|liga|topspiel|spieltag|kellerduell|ergebnisse/i.test(q)
    }
}
