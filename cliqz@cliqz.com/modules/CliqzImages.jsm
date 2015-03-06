'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzImages'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');




// var im_search_regex =  new RegExp('.*( #im| #c| #b| #y| im| image| bild)$');

// // Cliqz Bing or Yahoo
// function get_url(query, suffix){
//     IMAGES_API =  '';
//     switch (suffix) {
//     case '#b':
//     case 'image':
//     case 'bild':
//         IMAGES_API = 'http://images.fbt.co/api/bing-images-json?q='+query+'&n=20';
//         break;
//     case '#y':
//         IMAGES_API = 'http://images.fbt.co/api/yahoo-images-json?q='+query+'&n=30';
//         break;
//     case 'im':
//         IMAGES_API = 'http://images.fbt.co/api/images-json-verified?q='+query+'&n=30';
//     case '#im':
//     case '#c':
//         IMAGES_API = 'http://images.fbt.co/api/images-json?q='+query+'&n=30';
//         break;
//     default:
//         IMAGES_API = 'http://images.fbt.co/api/images-json-verified?q='+query+'&n=30';
//     }
//     return IMAGES_API;
// }



var IM_SEARCH_CONF = {
    'DEFAULT_THUMB' :{"width": 300, "height": 200},
    'IMAGES_MARGIN':4,
    'IMAGES_LINES': 2, // Max displayed grid rows (lines)
    'OFFSET': 30, // Offset for the title (should be set automatically)
    'MARGIN':2,
    'CELL_HEIGHT':100
}


function getheight(images, width, margin) {
    width -= margin * images.length; //images  margin
    var h = 0;
    for (var i = 0; i < images.length; ++i) {
        // console.log(' Debug:'+JSON.stringify(images[i].thumb))
        if ('thumb' in images[i]){
            h += (images[i].thumb.width || default_width) / (images[i].thumb.height || default_height);
        } else {
            h += IM_SEARCH_CONF.DEFAULT_THUMB.width/IM_SEARCH_CONF.DEFAULT_THUMB.height;
        }
    }
    return width / h;
}

function setheight(images, height, margin) {
    var verif_width = 0;
    var estim_width = 0;
    for (var i = 0; i < images.length; ++i) {
        var width_float = null
        if ('thumb' in images[i]){
            width_float = (height * images[i].thumb.width) /images[i].thumb.height;
        } else {
            width_float = (height * IM_SEARCH_CONF.DEFAULT_THUMB.width) /IM_SEARCH_CONF.DEFAULT_THUMB.height;
        }

        verif_width += (margin + width_float);
        images[i].disp_width = parseInt(width_float);
        estim_width +=  (margin + images[i].disp_width);
        images[i].disp_height = parseInt(height);
    }

    // Collecting sub-pixel error
    var error = estim_width - parseInt(verif_width)
    // console.log('estimation error:' + error + ', images nbr:' + images.length);

    if (error>0) {
        //var int_error = parseInt(Math.abs(Math.ceil(error)));
        // distribute the error on first images each take 1px
        for (var i = 0; i < error; ++i) {
            images[i].disp_width -= 1;
        }
    }
    else {
        error=Math.abs(error)
        //var int_error = parseInt(Math.abs(Math.floor(error)));
        for (var i = 0; i < error; ++i) {
            images[i].disp_width += 1;
        }
    }

    // Sanity check (Test)
    // var verify = 0;
    // for (var i = 0; i < images.length; ++i) {
    //    var width_float = height * images[i].image_width /images[i].image_height;
    //    verify += (images[i].width + IMAGES_MARGIN);
    // }
    // console.log('global width (verif): '+ verify+', verify (float):'+ verif_width +', int verify (float):'+ parseInt(verif_width));

}




var CliqzImages = {
    LOG_KEY: 'Cliqz Images',
    IM_SEARCH_CONF : {
        'DEFAULT_THUMB' :{"width": 300, "height": 200},
        'IMAGES_MARGIN':4,
        'IMAGES_LINES': 2, // Max displayed grid rows (lines)
        'OFFSET': 30, // Offset for the title (should be set automatically)
        'MARGIN':2,
        'CELL_HEIGHT':100
}
,
    test: function(){
        CliqzUtils.log('(empty test)', CliqzImages.LOG_KEY);
        return true;
    },
// ,
//     get: function(q, suffix, callback){
//         var IMAGES_API = get_url(q, suffix);
//         CliqzUtils.log(IMAGES_API, CliqzImages.LOG_KEY);
//         CliqzUtils.httpHandler('GET', IMAGES_API, function (res) {
//             var data = null;
//             var result = null;
//             try {
//                 // data = JSON.parse(res.response).results[0].data;
//                 data = JSON.parse(res.response);
//                 CliqzUtils.log(JSON.stringify(data), CliqzImages.LOG_KEY);
//                 // CliqzUtils.log(JSON.stringify(data.results), CliqzImages.LOG_KEY);
//                 if (('results' in data) && (data.results.length)){
//                     ret_obj = data.results[0].data || []
//                     ret_obj.hide = data.results.length ? false : true;

//                     result = Result.generic(Result.CLIQZI, "", null, "", "", null,
//                                             ret_obj);
//                 }
//             }
//             catch (err) {
//                 CliqzUtils.log('get. Exception:' + err.message, CliqzImages.LOG_KEY);
//             }
//             callback([result], q);
//         }, null, 2000);
//     },
//     isImagesSearch: function(query){
//         im_search_regex_res = im_search_regex.exec(query.trim());
//         if (im_search_regex_res != null){
//             // CliqzUtils.log('engine (hashtag):'+im_search_regex_res[1].toString(), CliqzImages.LOG_KEY);
//             return {
//                 flag:im_search_regex_res[1].trim(),
//                 query:im_search_regex_res[0].substring(0, query.length - im_search_regex_res[1].length)
//                 }
//             }
//         else  {
//             return {flag:'auto',
//                     query:query}
//         }
//     }



// Image search layout

    process_images_result : function (res, max_height) {
        // Processing images to fit with max_height and
        var tmp = [];
        var data = null;
        var effect_max_height = max_height;
        for(var k=0; k<res.results.length; k++){
            var r = res.results[k];
            if ('data' in r) {
                data = r.data;
            }
            if (r.vertical == 'images_beta' && data && data.template == 'images_beta') {
                var size =  res.width  - (CliqzUtils.isWindows(window)?20:15); //CLIQZ.Core.urlbar.clientWidth
                var n = 0;
                var images = data.items;
                // console.log('- Global width: '+ size + ', verif: '+ res.width
                //              +', images nbr: '+images.length); // TODO Define which is the better src for width f(time, scroll_bar_styles)
                w: while ((images.length > 0) && (n<IM_SEARCH_CONF.IMAGES_LINES)){
                    if (n==0){
                        effect_max_height = Math.min(max_height, (IM_SEARCH_CONF.CELL_HEIGHT-IM_SEARCH_CONF.OFFSET));
                        console.log('(line 1) effect_max_height: ' + effect_max_height);
                    }
                    var i = 1;
                    while ((i < images.length + 1) && (n<IM_SEARCH_CONF.IMAGES_LINES)){
                        var slice = images.slice(0, i);
                        var h = getheight(slice, size, IM_SEARCH_CONF.IMAGES_MARGIN);
                        // console.log('height: '+h + ', max height:' + effect_max_height);
                        if (h < effect_max_height) {
                            setheight(slice, h, IM_SEARCH_CONF.IMAGES_MARGIN);
                            effect_max_height =  effect_max_height - h + max_height;
                            tmp.push.apply(tmp, slice);
                            // console.log('height: '+h);
                            n++;
                            images = images.slice(i);
                            continue w;
                        }
                        i++;
                    }
                    setheight(slice, Math.min(effect_max_height, h), IM_SEARCH_CONF.IMAGES_MARGIN);
                    tmp.push.apply(tmp, slice);
                    n++;
                    break;
                }
                res.results[k].data.items = tmp;
                res.results[k].data.lines = n;
                // console.log('lines: '+n); // should be <= IM_SEARCH_CONF.IMAGES_LINES
                }
            }
        }

// end image-search layout

}
