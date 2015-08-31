'use strict';

//Injected only in the debug build

const {
  classes: Cc,
  interfaces: Ci,
  utils: Cu
} = Components;

var EXPORTED_SYMBOLS = ['CliqzExceptions'];

var TARGET = [
        'CliqzABTests',
        'CliqzAntiPhishing',
        //'CliqzAutocomplete', TODO
        'CliqzCalculator',
        'CliqzCategories',
        'CliqzClusterHistory',
        'CliqzExceptions',
        //'CliqzHandlebars', TODO
        'CliqzHistory',
        'CliqzHistoryAnalysis',
        'CliqzHistoryManager',
        'CliqzHistoryPattern',
        'CliqzHumanWeb',
        'CliqzImages',
        'CliqzLanguage',
        'CliqzRedirect',
        'CliqzResultProviders',
        'CliqzSearchHistory',
        'CliqzSmartCliqzCache',
        'CliqzSpellCheck',
        'CliqzTour',
        'CliqzUtils',
        'CUcrawl',
        'Extension',
        'Filter',
        'Mixer',
        'Result',
        'ToolbarButtonManager'
    ];

TARGET.forEach(function(d){
    Cu.import('chrome://cliqzmodules/content/' + d + '.jsm');
});

var lg = CliqzUtils.log

var CliqzExceptions = {
    attach: function(win){
        lg('Patching window');
        Object.keys(win.CLIQZ).forEach(function(module){
            win['CLIQZ.' + module] = win['CLIQZ'][module]
            patch('CLIQZ.' + module, win);

            // TEST
            // win.CLIQZ.Core.urlbar = null;
        });
    }
}

var CTX = this
//CliqzUtils.setTimeout(function(){
    TARGET.forEach(function(module){
        patch(module, CTX);
    });
//}, 200);

function patch(module, ctx){
    lg('patching: ' + module);
    Object.keys(ctx[module]).forEach(function(attr){
        if(typeof ctx[module][attr] == 'function'){
            //lg('patching: ' + module + '.'+ attr);

            ctx[module]['__' + attr] = ctx[module][attr];
            ctx[module][attr] = function(){
                try{
                    //lg('call', d + '.' + i, arguments)
                    return ctx[module]['__' + attr].apply(ctx[module], arguments);
                } catch(e){
                    if(!lg) return;
                    lg('ERR ' + module + '.'+ attr + ' -> ' + e.message);

                    CliqzUtils.httpGet(e.fileName, function(req){
                        var win = CliqzUtils.getWindow();
                        win.Application.getExtensions(function(extensions) {
                            var beVersion = extensions.get('cliqz@cliqz.com').version;

                            var ctx = req.response.split('\n').slice(e.lineNumber-3, e.lineNumber+2), line = e.lineNumber-2;
                            ctx = ctx.map(function(txt){ return (line++) + ': ' + txt  }).join('\n')

                            var data = {
                                    local_time: (new Date()).getTime(),
                                    session: CliqzUtils.cliqzPrefs.getCharPref('session'),
                                    short_message: e.message,
                                    stack: e.stack,
                                    fName: e.fileName,
                                    line: e.lineNumber,
                                    column: e.columnNumber,
                                    host:'CLIQZforFF',
                                    func: attr,
                                    module: module,
                                    agent: win.navigator.userAgent,
                                    language: win.navigator.language,
                                    version: beVersion,
                                    ctx: ctx
                            };
                            lg('ERR details: ' + JSON.stringify(data));

                            CliqzUtils.httpPost(
                                'http://graylog-ui.clyqz.com:9002/gelf',
                                null,
                                JSON.stringify(data));
                            });
                    });
                    throw e;
                }
            }
        }
    });
}