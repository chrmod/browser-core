'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzClusterHistory'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.4.14');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzClusterSeries',
  'chrome://cliqzmodules/content/CliqzClusterSeries.jsm?v=0.4.14');

var COLORS = [ '#993300', '#99CC99', '#003366']

var templates = {
        'github.com': {
            fun: function(urls) {

                var template = {
                    summary: 'Github personalized sitemap',
                    control: [
                        {title: 'Home', url: 'http://github.com/', iconCls: 'cliqz-fa fa-globe', cls: 'cliqz-cluster-result-url'},
                        {title: 'Settings', url: 'http://github.com/settings/', iconCls: 'cliqz-fa fa-bars', cls: 'cliqz-cluster-result-url'},
                    ],
                    topics: []
                }

                // note that I hardcoded the control, but no need for that, you can derive them too if you so wish

                var next_color = 0;
                var forbidden_path_0 = {'settings': true};
                var forbidden_path_1 = {};

                for(let i=0; i<urls.length;i++) {
                    var url = urls[i]['value'];
                    var title = urls[i]['comment'];

                    url = CliqzUtils.cleanMozillaActions(url);
                    var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                        domain = urlDetails.host,
                        path = urlDetails.path;

                    var vpath = path.toLowerCase().split('/');

                    // remove last element if '', that means that path ended with /
                    // also remove first element if '',

                    if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                    if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                    var donePath = vpath.join('/');
                    CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);

                    if (vpath.length==2) {
                        //if (forbidden_path_0[vpath[0]] || forbidden_path_1[vpath[1]]) next;

                        var org_name = vpath[0];
                        var repo_name = vpath[1];

                        // find if the first level exists, the org_name
                        var topic = null;
                        for(let j=0; j<template['topics'].length; j++) {
                            if (template['topics'][j]['label']==org_name) topic = template['topics'][j];
                        }

                        // if the topic did not exist, we must create it
                        if ((topic==null) && (template['topics'].length<4)) {
                            topic = {'label': org_name, urls: [], 'labelUrl': 'http://github.com/'+org_name+'/', color: COLORS[next_color], iconCls: 'cliqz-fa fa-database'};
                            template['topics'].push(topic);
                            next_color = (next_color+1)%COLORS.length;
                        }

                        if (topic!=null) {
                            topic['urls'].push({href: url, path: path, title: repo_name})
                        }
                    }
                }

                CliqzUtils.log(JSON.stringify(template), CliqzClusterHistory.LOG_KEY);
                return template;
            }
        },
        'basecamp.com': {
            fun: function(urls) {

                var template = {
                    summary: 'Basecamp personalized sitemap',
                    control: [
                    ],
                    topics: []
                }

                // note that I hardcoded the control, but no need for that, you can derive them too if you so wish

                var next_color = 0;
                var forbidden_path_0 = {'settings': true};
                var forbidden_path_1 = {};

                var isNumber = /^\d+$/;

                var seen_orgs_id = {};

                for(let i=0; i<urls.length;i++) {
                    var url = urls[i]['value'];
                    var title = urls[i]['comment'];

                    url = CliqzUtils.cleanMozillaActions(url);
                    var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                        domain = urlDetails.host,
                        path = urlDetails.path;
                    var vpath = path.toLowerCase().split('/');

                    // remove last element if '', that means that path ended with /
                    // also remove first element if '',

                    if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                    if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                    var donePath = vpath.join('/');
                    CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);

                    if (vpath.length==1) {
                        var org_id = vpath[0];
                        if (isNumber.test(org_id) && !seen_orgs_id[org_id]) {
                            var control = {title: 'Space ' + org_id , url: 'http://basecamp.com/' + org_id, iconCls: 'cliqz-fa fa-database', cls: 'cliqz-cluster-result-url'};
                            template['control'].push(control);
                            seen_orgs_id[org_id] = true;
                        }
                    }

                    if ((vpath.length==3) && (vpath[1]=='projects')) {
                        var org_id = vpath[0];
                        var project_id = vpath[2];
                        var topic_name = 'Projects';

                        // find if the first level exists, the org_name
                        var topic = null;
                        for(let j=0; j<template['topics'].length; j++) {
                            if (template['topics'][j]['label']==topic_name) topic = template['topics'][j];
                        }

                        // if the topic did not exist, we must create it
                        if ((topic==null) && (template['topics'].length<4)) {
                            topic = {'label': topic_name, urls: [], 'labelUrl': 'http://basecamp.com/'+org_id+'/', color: COLORS[next_color], iconCls: 'cliqz-fa fa-folder'};
                            template['topics'].push(topic);
                            next_color = (next_color+1)%COLORS.length;
                        }

                        if (topic!=null) {
                            topic['urls'].push({href: url, path: path, title: title})
                        }

                    }

                    if ((vpath.length==3) && (vpath[1]=='people')) {
                        var org_id = vpath[0];
                        var project_id = vpath[2];
                        var topic_name = 'People';

                        // find if the first level exists, the org_name
                        var topic = null;
                        for(let j=0; j<template['topics'].length; j++) {
                            if (template['topics'][j]['label']==topic_name) topic = template['topics'][j];
                        }

                        // if the topic did not exist, we must create it
                        if ((topic==null) && (template['topics'].length<4)) {
                            topic = {'label': topic_name, urls: [], 'labelUrl': 'http://basecamp.com/'+org_id+'/people', color: COLORS[next_color], iconCls: 'cliqz-fa fa-user'};
                            template['topics'].push(topic);
                            next_color = (next_color+1)%COLORS.length;
                        }

                        if (topic!=null) {
                            topic['urls'].push({href: url, path: path, title: title})
                        }

                    }
                }

                CliqzUtils.log(JSON.stringify(template), CliqzClusterHistory.LOG_KEY);
                return template;
            }
        },
        'twitter.com': {
            fun: function(urls) {

                var template = {
                    summary: 'Twitter personalized sitemap',
                    control: [
                        {title: 'Home', url: 'http://twitter.com/', iconCls: 'cliqz-fa fa-globe', cls: 'cliqz-cluster-result-url'},
                        {title: 'Search', url: 'http://twitter.com/', iconCls: 'cliqz-fa fa-search', cls: 'cliqz-cluster-result-url'},
                        {title: 'Discover', url: 'http://twitter.com/i/discover', iconCls: 'cliqz-fa fa-lightbulb-o', cls: 'cliqz-cluster-result-url'},
                    ],
                    topics: []
                }

                // note that I hardcoded the control, but no need for that, you can derive them too if you so wish

                var next_color = 0;
                var forbidden_path_0 = {'settings': true, 'i': true, 'search': true};
                var forbidden_path_1 = {};

                // unlike github there is only one topic for twitter
                var topic = {'label': 'People', urls: [], color: COLORS[next_color], iconCls: 'cliqz-fa fa-user'};
                template['topics'].push(topic);
                next_color = (next_color+1)%COLORS.length;


                for(let i=0; i<urls.length;i++) {
                    var url = urls[i]['value'];
                    var title = urls[i]['comment'];

                    url = CliqzUtils.cleanMozillaActions(url);
                    var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                        domain = urlDetails.host,
                        path = urlDetails.path;
                    var vpath = path.toLowerCase().split('/');

                    // remove last element if '', that means that path ended with /
                    // also remove first element if '',

                    if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                    if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                    var donePath = vpath.join('/');
                    CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);


                    if (vpath.length == 1) {
                        //if (forbidden_path_0[vpath[0]] || forbidden_path_1[vpath[1]]) next;

                        if (!forbidden_path_0[vpath[0]]) {
                            topic['urls'].push({href: url, path: path, title: vpath[0]})
                        }
                    }
                }

                CliqzUtils.log(JSON.stringify(template), CliqzClusterHistory.LOG_KEY);
                return template;
            }
        },
        'klout.com': {
            fun: function(urls) {

                var template = {
                    summary: 'Klout personalized sitemap',
                    control: [
                        {title: 'Home', url: 'http://klout.com/', iconCls: 'cliqz-fa fa-globe', cls: 'cliqz-cluster-result-url'},
                    ],
                    topics: []
                }

                // note that I hardcoded the control, but no need for that, you can derive them too if you so wish

                var next_color = 0;
                var forbidden_path_0 = {'settings': true, 'i': true, 'search': true, 'register': true, 'dashboard': true};
                var forbidden_path_1 = {};

                // unlike github there is only one topic for twitter
                var topic = {'label': 'People', urls: [], color: COLORS[next_color], iconCls: 'cliqz-fa fa-user'};
                template['topics'].push(topic);
                next_color = (next_color+1)%COLORS.length;


                for(let i=0; i<urls.length;i++) {
                    var url = urls[i]['value'];
                    var title = urls[i]['comment'];

                    url = CliqzUtils.cleanMozillaActions(url);
                    var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                        domain = urlDetails.host,
                        path = urlDetails.path;
                    var vpath = path.toLowerCase().split('/');

                    // remove last element if '', that means that path ended with /
                    // also remove first element if '',

                    if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                    if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                    var donePath = vpath.join('/');
                    CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);

                    if (vpath.length == 1) {
                        if (!forbidden_path_0[vpath[0]]) {
                            topic['urls'].push({href: url, path: path, title: vpath[0]})
                        }
                    }
                }

                CliqzUtils.log(JSON.stringify(template), CliqzClusterHistory.LOG_KEY);
                return template;
            }
        },
        'wikipedia.org': {
            fun: function(urls) {
                var template = {
                    summary: 'Wikipedia personalized sitemap',
                    control: [
                        {title: 'Home', url: 'http://wikipedia.org/', iconCls: 'cliqz-fa fa-globe', cls: 'cliqz-cluster-result-url'},
                    ],
                    topics: []
                }

                // note that I hardcoded the control, but no need for that, you can derive them too if you so wish

                var next_color = 0;
                var forbidden_path_0 = {'settings': true, 'i': true, 'search': true, 'register': true, 'dashboard': true};
                var forbidden_path_1 = {};

                // unlike github there is only one topic for twitter
                var topic = {'label': 'People', urls: [], color: COLORS[next_color], iconCls: 'cliqz-fa fa-user'};
                template['topics'].push(topic);
                next_color = (next_color+1)%COLORS.length;

                for(let i=0; i<urls.length;i++) {
                    var url = urls[i]['value'];
                    var title = urls[i]['comment'];

                    url = CliqzUtils.cleanMozillaActions(url);
                    var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                        domain = urlDetails.host,
                        path = urlDetails.path;
                    var vpath = path.toLowerCase().split('/');

                    // remove last element if '', that means that path ended with /
                    // also remove first element if '',

                    if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                    if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                    var donePath = vpath.join('/');
                    CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);

                    if (vpath.length == 1) {
                        //if (forbidden_path_0[vpath[0]] || forbidden_path_1[vpath[1]]) next;

                        if (!forbidden_path_0[vpath[0]]) {
                            topic['urls'].push({href: url, path: path, title: vpath[0]})
                        }
                    }
                }

                CliqzUtils.log(JSON.stringify(template), CliqzClusterHistory.LOG_KEY);
                return template;

            }
        }

    };


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

            var seriesClusteredHistory = CliqzClusterSeries.collapse(historyTransFiltered, cliqzReults, q);
            if (seriesClusteredHistory) {
                historyTransFiltered[0]['data'] = seriesClusteredHistory;
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
};
