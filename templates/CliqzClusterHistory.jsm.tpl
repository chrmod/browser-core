'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzClusterHistory'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.4.14');

$DSL_OUTPUT
    '_misc_1': {
	fun: function(urls) {

	    var keywords = {'Read':true,'Watch':true}

	    var ex1 = /\/s(\d+)e(\d+)[\/-_$$]*/;
	    var ex2 = /\/season\/(\d+)\/episode\/(\d+)[\/-_$$]*/;

	    var domains = {};

	    for(let i=0; i<urls.length;i++) {
		var url = urls[i]['value'];
		var title = urls[i]['comment'];

		var [domain, path] = CliqzClusterHistory.normalizeURL(url);
		var vpath = path.toLowerCase().split('/');
		// remove last element if '', that means that path ended with /
		// also remove first element if '',
		if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
		if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

		var d = null;

		d = path.match(ex1);
		if (d) {
		    if (domains[domain]==null) domains[domain]=[];
		    domains[domain].push([title, url, 'type1', parseInt(d[1]), parseInt(d[2])]);
		}

		d = path.match(ex2);
		if (d) {
		    if (domains[domain]==null) domains[domain]=[];
		    domains[domain].push([title, url, 'type2', parseInt(d[1]), parseInt(d[2])]);
		}
	    }

	    var maxDomain = null;
	    var maxDomainLen = -1;
	    Object.keys(domains).forEach(function (key) {
		if (domains[key].length > maxDomainLen) {
		    maxDomainLen=domains[key].length;
		    maxDomain=key;
		}
	    });

	    if (maxDomain!=null && maxDomainLen>4) {
		// at least 5
		CliqzUtils.log('The watching series detection has triggered!!! ' + maxDomain + ' ' + JSON.stringify(domains[maxDomain]), CliqzClusterHistory.LOG_KEY);

		var last_title = domains[maxDomain][0][0];
		var last_url = domains[maxDomain][0][1];
		var next_url = ''

		var template = {
		    summary: 'Looks like you want to watch something...',
		    control: [
		    ],
		    topics: [
			{
			    label: 'Your last episode was',
			    urls: [
				{href: last_url, path: '', title: last_title}
			    ],
			    labelUrl: last_url,
			    color: COLORS[0],
			    iconCls: 'cliqz-fa fa-video-camera'
			},
			{'label': 'Watch your next episode!', urls: [], 'labelUrl': next_url, color: COLORS[1], iconCls: 'cliqz-fa fa-play'},
		    ]
		}

		return template;

	    }
	    else return null;

	}
    }
};


var CliqzClusterHistory = CliqzClusterHistory || {
    LOG_KEY: 'cliqz cluster history: ',

    // we keep a different namespace than cliqz so that it does not get removed after a re-install
    cliqzLangPrefs: Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqz-lang.'),

    cluster: function(history) {
        // returns null (do nothing) if less that 5 results from history and one domains does not take >=70%
        if (history==null) return [false, null];

        var freqHash = {};
        var maxCounter = -1;
        var maxDomain = null;
        var historyTrans = [];

        for (let i = 0; history && i < history.matchCount; i++) {
            let style = history.getStyleAt(i),
                value = history.getValueAt(i),
                image = history.getImageAt(i),
                comment = history.getCommentAt(i),
                label = history.getLabelAt(i);

                historyTrans.push({style: style, value: value, image: image, comment: comment, label: label});
                var [domain, path] = CliqzClusterHistory.normalizeURL(value);

                if (freqHash[domain]==null) freqHash[domain]=[];
                freqHash[domain].push(i);

                if (freqHash[domain].length>maxCounter) {
                    maxDomain = domain;
                    maxCounter = freqHash[domain].length;
                }

        }

        if (history.matchCount < 10) {
            CliqzUtils.log('History cannot be clustered, matchCount < 10', CliqzClusterHistory.LOG_KEY);
            return [false, historyTrans];
        }

        var historyTransFiltered = [];
        for (let i=0; i<freqHash[maxDomain].length; i++) {
            historyTransFiltered.push(historyTrans[freqHash[maxDomain][i]]);
        }

        // has templates? if not quit and do the normal history, if so, then convert the maxDomain
        // to sitemap. This check is done again within CliqzClusterHistory.collapse but it's better to do
        // it twice so that we can avoid doing the filtering by now.
        if (templates[maxDomain]==null) {
            // in principle there is not template, but we must check for the possibility that falls to a
            // misc category,

            var miscClusteredHistory = CliqzClusterHistory.collapse('_misc_1', historyTransFiltered);
            if (miscClusteredHistory) {

                historyTransFiltered[0]['data'] = miscClusteredHistory;
                var v = [true, [historyTransFiltered[0]]];

                CliqzUtils.log(JSON.stringify([historyTransFiltered[0]]), CliqzClusterHistory.LOG_KEY);
                return v;

            }
            else {
                CliqzUtils.log('No template for domain: ' + maxDomain, CliqzClusterHistory.LOG_KEY);
                return [false, historyTrans];
            }
        }

        if (maxCounter < (history.matchCount * 0.60)) {
            CliqzUtils.log('History cannot be clustered, maxCounter < belowThreshold: ' + maxCounter + ' < ' + history.matchCount * 0.60, CliqzClusterHistory.LOG_KEY);
            return [false, historyTrans];
        }

        CliqzUtils.log(JSON.stringify([maxDomain, maxCounter, history.matchCount, freqHash]), CliqzClusterHistory.LOG_KEY);


        var clusteredHistory = CliqzClusterHistory.collapse(maxDomain, historyTransFiltered);

        if (!clusteredHistory) {
            // the collapse failed, perhaps: too few data?, missing template, error?
            // if clusteredHistory return the normal history

            CliqzUtils.log('History cannot be clustered, clusteredHistory is null', CliqzClusterHistory.LOG_KEY);
            return [false, historyTrans];
        }
        else {
            historyTransFiltered[0]['data'] = clusteredHistory;
            var v = [true, [historyTransFiltered[0]]];

            CliqzUtils.log(JSON.stringify([historyTransFiltered[0]]), CliqzClusterHistory.LOG_KEY);
            return v;
        }
    },
    collapse: function(domainForTemplate, filteredHistory) {
        CliqzUtils.log('Collapsing domain: ' + domainForTemplate + ' ' + filteredHistory.length + ' items', CliqzClusterHistory.LOG_KEY);
        var template = templates[domainForTemplate];
        if (!template) return null;

        return template.fun(filteredHistory);
    },
    normalizeURL: function(url) {
        // copy+pasted from Filter.jsm

        if(url.startsWith("moz-action:")) {
            var [, action, param] = url.match(/^moz-action:([^,]+),(.*)$$/);
            url = param;
        }

        var clean_url = url.toLowerCase().replace(/^http[s]*:\/\//,'').replace(/^www\./,'');
        var v = clean_url.split('/');
        var domain = v[0];
        var path = '/';

        if (v.length > 1) {
            // remove the query string
            v[v.length-1] = v[v.length-1].split('?')[0];

            if (v[1]=='#') {
                if (v.length > 2) path = '/' + v.splice(2, v.length-1).join('/');
            }
            else path = '/' + v.splice(1, v.length-1).join('/');
        }


        return [domain, path];
    }



};
