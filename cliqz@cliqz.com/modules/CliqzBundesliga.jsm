
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
            {results:[
                {
                    home: 'Bayern',
                    away: 'Dortmund'
                 },
                {
                    home: 'Koln',
                    away: "Schalke"
                }
                ]}
        );
        callback([result], originalQ)
    },
    isBundesligaSearch: function(q){
        return true;
    }
}
