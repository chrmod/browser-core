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
        //var IMAGES_API = 'http://images-search.fbt.co/api/images-json-verified?q='+q+'&n=20';
        var IMAGES_API = 'http://images.clyqz.com/api/images-json-verified?q='+q+'&n=15';
        CliqzUtils.httpHandler('GET', IMAGES_API, function (res) {
            var data = JSON.parse(res.response);
            var result = Result.generic(Result.CLIQZI, "", null, "", "", null,
                                        {
                                            hide: true,//data.results[0].data.items.length ? false : true,
                                            results: data.results[0].data.items
                                        });
            // CliqzUtils.log(data.results[0].data.items.length + ' returned images !', 'IMAGES');
            callback([result], q);
            // CliqzUtils.log(JSON.stringify(data.results), 'IMAGES');
        }, null, 2000);
    },
    isImagesSearch: function(q){
        return false;
        // if (q.indexOf('#im ') == 0)
        //     return { flag:true, query:q.substring(4)}
        // else
        //     return { flag:false}
    }
}
