'use strict';
var EXPORTED_SYMBOLS = ['Result'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CLIQZ',
  'chrome://cliqz/content/utils.js?v=0.4.12');

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
	generic: function(style, value, image, comment, label, query, data){
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

        var item = {
            style: style,
            val: value,
            comment: comment,
            label: label || value,
            query: query,
            data: data
        };

        return item;
    },
    // TODO - exclude cache
    cliqz: function(result){
        if(result.snippet){
            return Result.generic(
                Result.CLIQZR, //style
                result.url, //value
                null, //image -> favico
                result.snippet.title,
                null, //label
                result.source + ' ' + result.q + ' ' + result.confidence, //query
                Result.getData(result.snippet)
            );
        } else {
            return Result.generic(Result.CLIQZR, result.url);
        }
    },
    // check if a result should be kept in final result list
    isValid: function (url, urlparts) {
        // Google Filters
        // Filter all like:
        //    www.google.*/search?
        //    www.google.*/url? - for redirects
        if(urlparts.name.toLowerCase() == "google" &&
           urlparts.subdomains.length > 0 && urlparts.subdomains[0].toLowerCase() == "www" &&
           (urlparts.path.indexOf("/search?") == 0 || urlparts.path.indexOf("/url?") == 0)) {
            CLIQZ.Utils.log("Discarding result page from history: " + url)
            return false;
        }
        // Bing Filters
        // Filter all like:
        //    www.bing.com/search?
        if(urlparts.name.toLowerCase() == "bing" &&
           urlparts.subdomains.length > 0 && urlparts.subdomains[0].toLowerCase() == "www" && urlparts.path.indexOf("/search?") == 0) {
            CLIQZ.Utils.log("Discarding result page from history: " + url)
            return false;
        }
        // Yahoo filters
        // Filter all like:
        //   search.yahoo.com/search
        //   *.search.yahooo.com/search - for international 'de.search.yahoo.com'
        //   r.search.yahoo.com - for redirects 'r.search.yahoo.com'
        if(urlparts.name.toLowerCase() == "yahoo" &&
           ((urlparts.subdomains.length == 1 && urlparts.subdomains[0].toLowerCase() == "search" && urlparts.path.indexOf("/search") == 0) ||
            (urlparts.subdomains.length == 2 && urlparts.subdomains[1].toLowerCase() == "search" && urlparts.path.indexOf("/search") == 0) ||
            (urlparts.subdomains.length == 2 && urlparts.subdomains[0].toLowerCase() == "r" && urlparts.subdomains[1].toLowerCase() == "search"))) {
            CLIQZ.Utils.log("Discarding result page from history: " + url)
            return false;
        }

        return true;
    },
    // rich data and image
    getData: function(snip){
        return {
            description: snip.desc || snip.snippet,
            image: Result.getVerticalImage(snip.image, snip.rich_data) ||
                   Result.getOgImage(snip.og)
        };
    },
    getOgImage: function(og) {
        if(og && og.image && og.type){
            for(var type in Result.TYPE_VIDEO){
                if(og.type.indexOf(Result.TYPE_VIDEO[type]) != -1){
                    var image = { src: og.image };

                    if(og.duration && parseInt(og.duration)){
                        var parsedDuration = Result.tryGetImageDuration(og.duration)
                        if(parsedDuration) image.duration = parsedDuration;
                    }

                    return image;
                }
            }
        }
    },
    getVerticalImage: function(imageData, richData){
        if(imageData == undefined || imageData.src == undefined) return;

        var image = {
            src: imageData.src
        };


        if(imageData.width) image.width = imageData.width;
        if(imageData.height) image.height = imageData.height;
        if(imageData.ratio) image.ratio = imageData.ratio;

        // add duration from rich data
        if(richData && richData.attr){
            for(var i in richData.attr){
                if(richData.attr[i] && richData.attr[i].length == 2) { //tuples
                    if(richData.attr[i][0] == 'duration'){
                        var parsedDuration = Result.tryGetImageDuration(richData.attr[i][1])
                        if(parsedDuration) image.duration = parsedDuration;
                    }
                }
            }
        }

        return image
    },
    tryGetImageDuration: function(duration){
        try {
            let totalSeconds = parseInt(duration),
                min = Math.floor(totalSeconds/60),
                seconds = totalSeconds%60;
            return min + ':' + (seconds < 10 ? '0' + seconds : seconds);
        }
        catch(e){}

        return undefined;
    }
}