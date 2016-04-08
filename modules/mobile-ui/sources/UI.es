'use strict';
/*
 * This is the module which creates the UI for the results
 *   - uses handlebars templates
 *   - attaches all the needed listners (keyboard/mouse)
 */

import DelayedImageLoader from "mobile-ui/DelayedImageLoader";

var resultsBox = null,
    currentResults = null,
    imgLoader = null
    ;

var UI = {
    init: function(){},
    main: function(box) {
        //check if loading is done
        if(!CliqzHandlebars.tplCache.main)return;

        box.innerHTML = CliqzHandlebars.tplCache.main();

        resultsBox = document.getElementById('cliqz-results',box);
    },
    results: function(res){
        var query = res.q || '';

        currentResults = enhanceResults(res);
        if (imgLoader) imgLoader.stop();

        // Results that are not ready (extra results, for which we received a callback_url)
        var asyncResults = currentResults.results.filter(assessAsync(true));
        currentResults.results = currentResults.results.filter(assessAsync(false));

        //TODO copy async
        redrawDropdown(CliqzHandlebars.tplCache.results(currentResults), query);

        if(asyncResults.length > 0) loadAsyncResult(asyncResults, query);

        imgLoader = new DelayedImageLoader('#cliqz-results img[data-src], #cliqz-results div[data-style], #cliqz-results span[data-style]');
        imgLoader.start();

        return currentResults;
    },
    VIEWS: {}
};

function loadAsyncResult(res, query) {
    for (var i in res) {
      var r = res[i];
      var query = r.text || r.query;
      var qt = query + ": " + new Date().getTime();
      CliqzUtils.log(r,"LOADINGASYNC");
      CliqzUtils.log(query,"loadAsyncResult");
      var loop_count = 0;
      var async_callback = function(req) {
          CliqzUtils.log(query,"async_callback");
          var resp = null;
          try {
            resp = JSON.parse(req.response).results[0];
          }
          catch(err) {
            res.splice(i,1);
          }
          if (resp &&  urlbar.value == query) {

            var kind = r.data.kind;
            if ("__callback_url__" in resp.data) {
                // If the result is again a promise, retry.
                if (loop_count < 10 /*smartCliqzMaxAttempts*/) {
                  setTimeout(function() {
                    loop_count += 1;
                    CliqzUtils.httpGet(resp.data.__callback_url__, async_callback, async_callback);
                  }, 100 /*smartCliqzWaitTime*/);
                }
                else if (currentResults.results.length == 0) {
                  redrawDropdown(CliqzHandlebars.tplCache.noResult(CliqzUtils.getNoResults()), query);
                }
            }
            else {
              r.data = resp.data;
              r.url = resp.url;
              r.data.kind = kind;
              r.data.subType = resp.subType;
              r.data.trigger_urls = resp.trigger_urls;
              r.vertical = r.data.template;
              r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
              r.logo = CliqzUtils.getLogoDetails(r.urlDetails);

              if(resultsBox && urlbar.value == query) {
                  // Remove all existing extra results
                  currentResults.results = currentResults.results.filter(function(r) { return r.type != "cliqz-extra"; } );
                  // add the current one on top of the list
                  currentResults.results.unshift(r);

                  if (currentResults.results.length > 0) {
                    redrawDropdown(CliqzHandlebars.tplCache.results(currentResults), query);
                  }
                  else {
                    redrawDropdown(CliqzHandlebars.tplCache.noResult(CliqzUtils.getNoResults()), query);
                  }
              }
            }
          }
          // to handle broken promises (eg. Weather and flights) on mobile
          else if (r.data && r.data.__callback_url__ && CLIQZEnvironment && CLIQZEnvironment.shiftResults) {
            CLIQZEnvironment.shiftResults();
          }
          else {
            res.splice(i,1);
            if (currentResults.results.length == 0)
              redrawDropdown(CliqzHandlebars.tplCache.noResult(CliqzUtils.getNoResults()), query);
          }

      };
      CliqzUtils.httpGet(r.data.__callback_url__, async_callback, async_callback);
    }
}


function assessAsync(getAsync){
    return function(result){
        var isAsync = result.type == "cliqz-extra" && result.data && "__callback_url__" in result.data ;
        return getAsync ? isAsync : !isAsync;
    }
}

function redrawDropdown(newHTML){
    resultsBox.innerHTML = newHTML;
}

function enhanceResults(res){
    for(var i=0; i<res.results.length; i++) {
        var r = res.results[i];
        r.data = r.data || {};

        enhanceSpecificResult(r);

        r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
        r.logo = CliqzUtils.getLogoDetails(r.urlDetails);
        r.vertical = (r.data.template && TEMPLATES.hasOwnProperty(r.data.template)) ? r.data.template : 'generic';

        //extract debug info from title
        var _tmp = getDebugMsg(r.title);
        r.title = _tmp[0];
        r.debug = _tmp[1];
    }

    res.results = res.results.filter(function(r){ return !(r.data && r.data.adult); });

    return res;
}

// debug message are at the end of the title like this: "title (debug)!"
function getDebugMsg(fullTitle){
    // regex matches two parts:
    // 1) the title, can be anything ([\s\S] is more inclusive than '.' as it includes newline)
    // followed by:
    // 2) a debug string like this " (debug)!"
    if(fullTitle === null) {
      return [null, null];
    }
    var r = fullTitle.match(/^([\s\S]+) \((.*)\)!$/)
    if(r && r.length >= 3)
        return [r[1], r[2]]
    else
        return [fullTitle, null]
}

function enhanceSpecificResult(r) {
    var specificView;
    if (r.subType && JSON.parse(r.subType).ez) {
        // Indicate that this is a RH result.
        r.type = "cliqz-extra";
    }
    if(r.data.superTemplate && CLIQZEnvironment.TEMPLATES.hasOwnProperty(r.data.superTemplate)) {
        r.data.template = r.data.superTemplate;
    }

    specificView = UI.VIEWS[r.data.template] || UI.VIEWS.generic;
    if (specificView && specificView.enhanceResults) {
        specificView.enhanceResults(r.data);
    }
}

//returns the first child which matches the selector
function $(selector, ctx){return (ctx || document).querySelector(selector); }

//returns all the childs which match the selector
function $$(selector, ctx){return (ctx || document).querySelectorAll(selector); }

//returns the ctx itself if its a match or first child which matches the selector
function $_(selector, ctx){
    if(matches(ctx || document, selector)){
        return ctx || document;
    } else return $(selector, ctx);
}


// returns true if the selector matches the element
function matches(elem, selector) {
    var f = elem.matches || elem.webkitMatchesSelector || elem.mozMatchesSelector || elem.msMatchesSelector;
    if(f){
        return f.bind(elem)(selector);
    }
    else {
        //older FF doest have mathes - create our own
        return elem.parentNode && Array.prototype.indexOf.call(elem.parentNode.querySelectorAll(selector), elem) != -1;
    }
}

/**
 * Finds the closest ancestor of @p elem that matches @p selector.
 *
 * @see http://stackoverflow.com/questions/15329167/closest-ancestor-matching-selector-using-native-dom
 */
function closest(elem, selector) {
    while (elem) {
        if (matches(elem, selector)) {
            return elem;
        } else {
            elem = elem.parentElement;
        }
    }
    return false;
}

UI.clickHandlers = {};
Object.keys(CliqzHandlebars.TEMPLATES).concat(CliqzHandlebars.MESSAGE_TEMPLATES).concat(CliqzHandlebars.PARTIALS).forEach(function (templateName) {
  UI.VIEWS[templateName] = Object.create(null);
  try {
    var module = CLIQZ.System.get("mobile-ui/views/"+templateName);
    if (module) {
      UI.VIEWS[templateName] = new module.default(ctx);

      if(UI.VIEWS[templateName].events && UI.VIEWS[templateName].events.click){
        Object.keys(UI.VIEWS[templateName].events.click).forEach(function (selector) {
          UI.clickHandlers[selector] = UI.VIEWS[templateName].events.click[selector];
        });
      }
    }
  } catch (ex) {
    console.error(ex);
  }
});

export default UI;
