'use strict';
var EXPORTED_SYMBOLS = ['Result'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CLIQZ',
  'chrome://cliqz/content/utils.js');

var _log = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService),
    log = function(str){
    _log.logStringMessage('Result.jsm: ' + str);
}

var Result = {
    CLIQZR: 'cliqz-results',
    CLIQZS: 'cliqz-suggestions',
    CLIQZC: 'cliqz-custom',
    CLIQZICON: 'http://beta.cliqz.com/favicon.ico',
    TYPE_VIDEO: ['video', 'tv_show', 'youtube'],
	generic: function(style, value, image, comment, label, query, thumbnail, imageDescription){
        //try to show host if no comment(page title) is provided
        if(style !== Result.CLIQZS       // is not a suggestion
           && style !== Result.CLIQZC       // is not a custom search
           && (!comment || value == comment)   // no comment(page title) or comment is exactly the url
           && CLIQZ.Utils.isCompleteUrl(value)){       // looks like an url
            let host = CLIQZ.Utils.getDetailsFromUrl(value).host
            if(host){
                comment = host;
            }
        }
        if(!comment){
            comment = value;
        }
        return {
            style: style,
            val: value,
            image: thumbnail, //image || this.createFavicoUrl(value),
            comment: comment,
            label: label || value,
            query: query,
            imageDescription: imageDescription
        };
    },
    // TODO - exclude cache
    cliqz: function(result, cache){
        if(result.snippet){
            let og = result.snippet.og, thumbnail, duration;
            if(og && og.image && og.type)
                for(var type in Result.TYPE_VIDEO)
                    if(og.type.indexOf(Result.TYPE_VIDEO[type]) != -1){
                        thumbnail = og.image;
                        if(og.duration && parseInt(og.duration)){
                            let seconds = parseInt(og.duration);
                            duration = Math.floor(seconds/60) + ':' + seconds%60; //might be undefined
                        }
                        break;
                    }
            return Result.generic(
                Result.CLIQZR, //style
                result.url, //value
                null, //image -> favico
                result.snippet.title,
                null, //label
                Result.getExpandedQuery(result.url, cache), //query
                thumbnail, // video thumbnail
                duration // image description -> video duration
            );
        } else {
            return Result.generic(Result.CLIQZR, result.url);
        }
    },
    // check if a result should be kept in final result list
    isValid: function (url, urlparts) {
        // Ignore result if is this a google search result from history
        if(urlparts.name.toLowerCase() == "google" && urlparts.subdomains.length > 0 &&
           urlparts.subdomains[0].toLowerCase() == "www" &&
           (urlparts.path.indexOf("/search?") == 0 || urlparts.path.indexOf("/url?") == 0)) {
            CLIQZ.Utils.log("Discarding google result page from history: " + url)
            return true;
        }
        return false;
    },
    // Find the expanded query that was used for returned URL
    getExpandedQuery: function(url, cache) {
        for(let i in cache || []) {
            let el = cache[i];
            for(let j in el.result || []) {
                var r = el.result[j]

                if( r == url )
                    return 'Query[' +el.q + '] BIGRAM[' + el.bigram + ']';
            }
        }
        return "<unknown>"
    },
}