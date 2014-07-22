'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzClusterHistory'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.4.14');

/** Pads an integer with zeros. Why isn't this part of the string API? */
function zFill(num, width) {
    var number = num.toString();
    while (number.length < width) number = "0" + number;
    return number;
}

//var COLORS = ['purple', 'blue', 'pink', 'green', 'gray'];
var COLORS = [ '#993300', '#99CC99', '#003366']
var DISABLED_COLOR = ['#D6D6D6']

var templates = {

        '_misc_1': {
            fun: function(urls) {

                var keywords = {'Read':true,'Watch':true}

                var regexs = [/(.*s[ae][ai]?[sz]on[-\/_ ])(\d{1,2})([-\/_ ]episode[-\/_ ])(\d{1,2})(.*)/,
                              /(.*s[ae][ai]?[sz]on[-\/_ ])(\d{1,2})([-\/_ ])(\d{1,2})(.*)/,
                              /(.*s[ae][ai]?[sz]on[-\/_ ])(\d{1,2})(.*)(\d{1,2})(.*)/,
                              /(.*s)(\d{1,2})(_?ep?)(\d{1,2})(.*)/,
                              /(.*[-_\/])(\d{1,2})(x)(\d{1,2})([-_\.].*)/];

                var domains = {};

                for(let i=0; i<urls.length;i++) {
                    var url = urls[i]['value'];
                    var title = urls[i]['comment'];

                    url = CliqzClusterHistory.normalizeURL(url);
                    var [domain, path] = CliqzClusterHistory.splitURL(url);
                    var real_domain = url.substring(0, url.indexOf(domain) + domain.length)

                    var vpath = path.toLowerCase().split('/');
                    // remove last element if '', that means that path ended with /
                    // also remove first element if '',
                    if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                    if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                    for (let r = 0; r < regexs.length; r++) {
                        var d = path.match(regexs[r]);
                        if (d) {
                            if (domains[domain]==null) domains[domain]=[];
                            domains[domain].push([title, url, 'type' + r, parseInt(d[2]), parseInt(d[4]), d]);
                            break;
                        }
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
                    CliqzUtils.log(JSON.stringify(domains), 'DOMAINS', CliqzClusterHistory.LOG_KEY);

                    /* Find the last URL in the series. */
                    var last_item = domains[maxDomain][0];
                    var last_s = 0;
                    var last_ep = 0;
                    for (let i = 0; i < domains[maxDomain].length; i++) {
                        if (domains[maxDomain][i][3] > last_s) {
                            last_s = domains[maxDomain][i][3];
                            last_ep = domains[maxDomain][i][4];
                            last_item = domains[maxDomain][i]
                        } else if (domains[maxDomain][i][3] == last_s) {
                            if (domains[maxDomain][i][4] > last_ep) {
                                last_ep = domains[maxDomain][i][4];
                                last_item = domains[maxDomain][i]
                            }
                        }
                        CliqzUtils.log(last_s + ' ' + last_ep, 'last_show', CliqzClusterHistory.LOG_KEY)
                    }
                    CliqzUtils.log('getting next episode...', CliqzClusterHistory.LOG_KEY);

                    var last_title = last_item[0];
                    var last_url = last_item[1];

                    /* Come up with candidates for the next episode. */
                    var s_width = last_item[5][2].length
                    var ep_width = last_item[5][4].length
                    var url_base = last_url.substring(0, last_url.length - last_item[5][0].length)
                    var next_urls = [
                        url_base + last_item[5][1] + last_item[5][2] + last_item[5][3] +
                        zFill(last_ep + 1, ep_width) + last_item[5][5]
                        ,
                        url_base + last_item[5][1] + zFill(last_s + 1, s_width) +
                        last_item[5][3] + zFill(1, ep_width) + last_item[5][5]
                    ];
                    CliqzUtils.log('Candidate URLs: ' + JSON.stringify(next_urls), CliqzClusterHistory.LOG_KEY);

                    var template = {
                        summary: 'Looks like you want to watch something...',
                        url: real_domain,
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
                            {'label': 'Watch your next episode!', urls: [], 'labelUrl': '', color: DISABLED_COLOR, iconCls: 'cliqz-fa fa-play'},
                        ],
                    }

                    /*
                     * Try each next URL candidate. If the page exists, we display that
                     * as the next episode.
                     */
                    next_urls.forEach(function (next_url) {
                        CliqzUtils.log('Next URL to get: ' + next_url, CliqzClusterHistory.LOG_KEY);
                        CliqzUtils.httpGet(next_url, function(res) {
                            CliqzUtils.log('Next url: ' + next_url + ', status: ' + res.status, CliqzClusterHistory.LOG_KEY);
                            if (res.status == 200 && template.topics[1].urls.length == 0) {
                                CliqzUtils.log('200 and not updated.', CliqzClusterHistory.LOG_KEY);
                                /*
                                 * A result can still be invalid, as when we do not guess the correct s/e,
                                 * sites sometimes lie, so the URL and the title is not always in sync.
                                 */
                                var invalid_result = false;
                                var m = res.responseText.match(/<title>(.*?)<\/title>/);
                                var next_title = null;
                                if (m) {
                                    next_title = m[1];
                                    for (let r = 0; r < regexs.length; r++) {
                                        var d = next_title.toLowerCase().match(regexs[r]);
                                        if (d) {
                                            var next_s = parseInt(d[2]);
                                            var next_ep = parseInt(d[4]);
                                            if (!((next_s == last_s && next_ep == last_ep + 1) ||
                                                  (next_s == last_s + 1 && next_ep == 1))) {
                                                CliqzUtils.log('Site is lying: title >' + next_title +
                                                               '< does not refer to a next episode.', CliqzClusterHistory.LOG_KEY);
                                                invalid_result = true;
                                                break;
                                            }
                                        }
                                    }
                                }
                                if (!invalid_result) {
                                    CliqzUtils.log('Valid result.', CliqzClusterHistory.LOG_KEY);
                                    template.topics[1].color = COLORS[1];
                                    template.topics[1].labelUrl = next_url;
                                    if (next_title) {
                                        template.topics[1].urls = [{href: next_url, path: '', title: m[1]}];
                                    }

                                    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                                                    .getService(Components.interfaces.nsIWindowMediator),
                                    win = wm.getMostRecentWindow("navigator:browser");
                                    win.CLIQZ.UI.redrawCluster({
                                       data: template
                                    })
                                    CliqzUtils.log('Redrew', CliqzClusterHistory.LOG_KEY);
                                }
                            }
                        });
                    });

                    return template;
                }
                else return null;

            }
        },
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

                    url = CliqzClusterHistory.normalizeURL(url);
                    var [domain, path] = CliqzClusterHistory.splitURL(url);
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

                    url = CliqzClusterHistory.normalizeURL(url);
                    var [domain, path] = CliqzClusterHistory.splitURL(url);
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

                    url = CliqzClusterHistory.normalizeURL(url);
                    var [domain, path] = CliqzClusterHistory.splitURL(url);
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

                    url = CliqzClusterHistory.normalizeURL(url);
                    var [domain, path] = CliqzClusterHistory.splitURL(url);
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
        'wikipedia.com': {
            fun: function(urls) {
                var template = {
                    summary: 'Wikipedia personalized sitemap',
                    control: [
                        {title: 'Home', url: 'http://wikipedia.com/', iconCls: 'cliqz-fa fa-globe', cls: 'cliqz-cluster-result-url'},
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

                    url = CliqzClusterHistory.normalizeURL(url);
                    var [domain, path] = CliqzClusterHistory.splitURL(url);
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
                var [domain, path] = CliqzClusterHistory.splitURL(CliqzClusterHistory.normalizeURL(value));

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
    normalizeURL: function(url) {
        // copy+pasted from Filter.jsm

        if(url.startsWith("moz-action:")) {
            var [, action, param] = url.match(/^moz-action:([^,]+),(.*)$/);
            url = param;
        }
        return url;
    },
    splitURL: function(url) {
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

        // CliqzUtils.log(path, CliqzClusterHistory.LOG_KEY)
        return [domain, path];
    }
}
