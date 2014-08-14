'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzClusterHistory'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.5.06');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzClusterSeries',
  'chrome://cliqzmodules/content/CliqzClusterSeries.jsm?v=0.5.06');

/******************************************************
 * Warning: this file is auto-generated; do not edit. *
 ******************************************************/

$DSL_OUTPUT

var CliqzClusterHistory = CliqzClusterHistory || {
    LOG_KEY: 'cliqz cluster history: ',

    cluster: function(history, cliqzResults, q) {
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
                var urlDetails = CliqzUtils.getDetailsFromUrl(value),
                    domain = urlDetails.host;;

                if (freqHash[domain]==null) freqHash[domain]=[];
                freqHash[domain].push(i);

                if (freqHash[domain].length>maxCounter) {
                    maxDomain = domain;
                    maxCounter = freqHash[domain].length;
                }
        }

        CliqzUtils.log('maxDomain: ' + maxDomain, CliqzClusterHistory.LOG_KEY);

        if(!CliqzUtils.getPref("abCluster", false)){
            CliqzUtils.log('Disabled', CliqzClusterHistory.LOG_KEY);
            return [false, historyTrans];
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
        if (templates[maxDomain]==null && q.length > 6) {
            // in principle there is not template, but we must check for the possibility that falls to a
            // misc category,

            var seriesClusteredHistory = CliqzClusterSeries.collapse(historyTransFiltered, cliqzResults, q);
            if (seriesClusteredHistory) {
                historyTransFiltered[0]['data'] = seriesClusteredHistory;
                historyTransFiltered[0]['style'] = 'cliqz-series';
                var v = [true, [historyTransFiltered[0]]];

                CliqzUtils.log(JSON.stringify([historyTransFiltered[0]]), CliqzClusterHistory.LOG_KEY);
                return v;

            }
            else {
                CliqzUtils.log('No templates for domain: ' + maxDomain, CliqzClusterHistory.LOG_KEY);
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
        } else if (clusteredHistory['topics'].length == 0) {
	    // no URLs related to the topics defined for the site found in
	    // the history URLs
            CliqzUtils.log('History cannot be clustered, no URLs related to the topics', CliqzClusterHistory.LOG_KEY);
	    return [false, historyTrans];
        } else {
            historyTransFiltered[0]['data'] = clusteredHistory;
            historyTransFiltered[0]['style'] = 'cliqz-cluster';
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
};
