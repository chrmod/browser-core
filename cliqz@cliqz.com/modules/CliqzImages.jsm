
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
                                  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var EXPORTED_SYMBOLS = ['CliqzImages'];

var CliqzImages = {
    get: function(q, callback){
        CliqzUtils.log('enabled', 'IMAGES');       
        //var IMAGES_API = 'http://cliqz:cliqz-245@im-search-cache-elb.fbt.co/api/images-json?q='+q+'&n=20';
        var IMAGES_API = 'http://im-search-cache-elb.fbt.co/api/images-json?q='+q+'&n=20';
        CliqzUtils.httpHandler('GET', IMAGES_API, function (res) {
            var data = JSON.parse(res.response);
            var result = Result.generic(Result.CLIQZI, "", null, "", "", null,
                                        {
                                            hide: data.items.length ? false : true, 
                                            results: data.items
                                        });
            CliqzUtils.log(data.items.length + ' returned images !', 'IMAGES');
            callback([result], q);
            // CliqzUtils.log(JSON.stringify(data.results), 'IMAGES');
        }, null, 2000);
    },
    isImagesSearch: function(q){
        if (q.indexOf('#im ') == 0)
            return { flag:true, query:q.substring(4)}
        else
            return { flag:false}
    }
}
