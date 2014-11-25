'use strict';
/*
 * This module acts as a result factory
 *
 */

var EXPORTED_SYMBOLS = ['Result'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

// returns the super type of a result - type to be consider for UI creation
function getSuperType(result){
    if(result.snippet && result.snippet.rich_data){
        return result.snippet.rich_data.type
    }
    return null;
}

var Result = {
    CLIQZR: 'cliqz-results',
    CLIQZS: 'cliqz-suggestions',
    CLIQZC: 'cliqz-custom',
    CLIQZW: 'cliqz-weather',
    CLIQZB: 'cliqz-bundesliga',
    CLIQZE: 'cliqz-extra',
    CLIQZCLUSTER: 'cliqz-cluster',
    CLIQZSERIES: 'cliqz-series',
    CLIQZICON: 'http://beta.cliqz.com/favicon.ico',
    RULES: {
        'video': [
            { 'domain': 'youtube.com', 'ogtypes': ['video', 'youtube'] },
            { 'domain': 'vimeo.com', 'ogtypes': ['video'] },
            { 'domain': 'myvideo.de', 'ogtypes': ['video.tv_show', 'video.episode', 'video.other'] },
            { 'domain': 'dailymotion.com', 'ogtypes': ['video'] },
            { 'vertical': 'video' }
        ],
        'poster': [
            { 'domain': 'imdb.com', 'ogtypes': ['video.tv_show', 'tv_show', 'movie', 'video.movie', 'game', 'video.episode', 'actor', 'public_figure'] }
        ],
        'person': [
            { 'domain': 'xing.com', 'ogtypes': [ 'profile'] },
            { 'vertical': 'people' }
        ],
        'hq': [
            { 'vertical': 'hq'}
        ],
        'news': [
            { 'vertical': 'news'}
        ],
        'shopping': [
            { 'vertical': 'shopping'}
        ]
    },
	generic: function(style, value, image, comment, label, query, data){
        //try to show host name if no title (comment) is provided
        if(style.indexOf(Result.CLIQZC) === -1       // is not a custom search
           && (!comment || value == comment)   // no comment(page title) or comment is exactly the url
           && CliqzUtils.isCompleteUrl(value)){       // looks like an url
            var host = CliqzUtils.getDetailsFromUrl(value).name;
            if(host && host.length>0){
                comment = host[0].toUpperCase() + host.slice(1);
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
    cliqz: function(result){
        var resStyle = Result.CLIQZR + ' sources-' + CliqzUtils.encodeSources(getSuperType(result) || result.source);
        var debugInfo = result.source + ' ' + result.q + ' ' + result.confidence;
        if(result.snippet){
            return Result.generic(
                resStyle, //style
                result.url, //value
                null, //image -> favico
                result.snippet.title,
                null, //label
                debugInfo, //query
                Result.getData(result)
            );
        } else {
            return Result.generic(resStyle, result.url, null, null, null, debugInfo);
        }
    },
    cliqzExtra: function(result){
        return Result.generic(
            Result.CLIQZE, //style
            result.url, //value
            null, //image -> favico
            null,
            null, //label
            result.q, //query
            result.data
        );
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
            CliqzUtils.log("Discarding result page from history: " + url, "Result.isValid")
            return false;
        }
        // Bing Filters
        // Filter all like:
        //    www.bing.com/search?
        if(urlparts.name.toLowerCase() == "bing" &&
           urlparts.subdomains.length > 0 && urlparts.subdomains[0].toLowerCase() == "www" && urlparts.path.indexOf("/search?") == 0) {
            CliqzUtils.log("Discarding result page from history: " + url, "Result.isValid")
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
            CliqzUtils.log("Discarding result page from history: " + url, "Result.isValid")
            return false;
        }

        return true;
    },
    // rich data and image
    getData: function(result){
        //TODO: rethink the whole image filtering
        if(!result.snippet)
            return;

        var urlparts = CliqzUtils.getDetailsFromUrl(result.url),
            resp = {
                richData: result.snippet.rich_data
            },
            source = getSuperType(result) || result.source;

        resp.type = "other";
        for(var type in Result.RULES){
            var rules = Result.RULES[type];

            for(var rule_i in rules) {
                var rule = rules[rule_i];
                if(rule.domain && urlparts.host.indexOf(rule.domain) != -1)
                    for(var ogtype in (rule.ogtypes || []))
                        if(result.snippet && result.snippet.og &&
                           result.snippet.og.type == rule.ogtypes[ogtype])
                                resp.type = type;

                var verticals = source.split(',');
                for(var v in verticals){
                    if(verticals[v].trim() == rule.vertical)
                        resp.type = type;
                }
            }


        resp.description = result.snippet.desc || result.snippet.snippet;

        var ogT = result.snippet && result.snippet.og? result.snippet.og.type: null,
            imgT = result.snippet && result.snippet.image? result.snippet.image.type: null;

        if(resp.type != 'other' || ogT == 'cliqz' || imgT == 'cliqz')
            resp.image = Result.getVerticalImage(result.snippet.image, result.snippet.rich_data) ||
                         Result.getOgImage(result.snippet.og)
        }

        return resp;
    },
    getOgImage: function(og) {
        if(og && og.image){
            var image = { src: og.image };

            if(og.duration && parseInt(og.duration)){
                var parsedDuration = Result.tryGetImageDuration(og.duration)
                if(parsedDuration) image.duration = parsedDuration;
            }

            return image;
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
        if(richData && richData.duration){
            var parsedDuration = Result.tryGetImageDuration(richData.duration)
            if(parsedDuration) image.duration = parsedDuration;
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
