'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzClusterHistory'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzClusterSeries',
  'chrome://cliqzmodules/content/CliqzClusterSeries.jsm');

/******************************************************
 * Warning: this file is auto-generated; do not edit. *
 ******************************************************/


var COLORS = ['#CC3399', '#27B0CE', '#1777E2'];

var templates = {

    'bild.de': {
        fun: function(urls) {

            var site = 'Bild';
            var template = {
                summary: CliqzUtils.getLocalizedString('Sitemap_Summary').replace('{}', site),
                control: [{title: CliqzUtils.getLocalizedString('Sitemap_Bild_Shop'), url: 'http://shop.bild.de', iconCls: 'null'},
                          {title: CliqzUtils.getLocalizedString('Sitemap_Bild_Community'), url: 'http://www.bild.de/ka/p/community', iconCls: 'null'},
                          {title: CliqzUtils.getLocalizedString('Sitemap_Bild_Login'), url: 'https://secure.mypass.de/sso/web-bigp/login?service=https://don.bild.de/www/li/http%253A%252F%252Fwww.bild.de%252F', iconCls: 'null'}],
                control_set: {},
                topics: [],
                url: 'http://www.bild.de'
            };

            var next_color = 0;
            var cond_match = null;  // For groups in regex conditions

            for(let i=0; i<urls.length;i++) {
                var url = urls[i]['value'];
                var title = urls[i]['comment'];

                var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                    domain = urlDetails.host,
                    path = urlDetails.path;
                var dpath = domain.toLowerCase().split('.');
                dpath.reverse();
                var vpath = path.toLowerCase().split('/');

                // remove last element if '', that means that path ended with /
                // also remove first element if '',

                if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);

                if (vpath[1] == 'startseite' && vpath[2] == vpath[0]) {
                    var item = vpath[0];
                    var label = CliqzUtils.getLocalizedString('Sitemap_Bild_Topics');

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], color: COLORS[next_color], label_set: {}, iconCls: 'null'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var item_title = item;
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
                else if (vpath[0] == 'bundesliga' && vpath[1] == '1-liga') {
                    var item = null;
                    var label = CliqzUtils.getLocalizedString('Sitemap_Bild_Topics');

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], color: COLORS[next_color], label_set: {}, iconCls: 'null'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var item_title = CliqzUtils.getLocalizedString('Sitemap_Bild_Bundesliga');
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
            }

            CliqzUtils.log(JSON.stringify(template), CliqzClusterHistory.LOG_KEY);
            return template;
        }
    },
    'basecamp.com': {
        fun: function(urls) {

            var site = 'BaseCamp';
            var template = {
                summary: CliqzUtils.getLocalizedString('Sitemap_Summary').replace('{}', site),
                control: [],
                control_set: {},
                topics: [],
                url: 'basecamp.com'
            };

            var next_color = 0;
            var cond_match = null;  // For groups in regex conditions

            for(let i=0; i<urls.length;i++) {
                var url = urls[i]['value'];
                var title = urls[i]['comment'];

                var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                    domain = urlDetails.host,
                    path = urlDetails.path;
                var dpath = domain.toLowerCase().split('.');
                dpath.reverse();
                var vpath = path.toLowerCase().split('/');

                // remove last element if '', that means that path ended with /
                // also remove first element if '',

                if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);

                if (vpath[0] == 'settings') {


                }
                else if ((vpath.length > 0 && (cond_match = vpath[0].match(/^\d+$/)) != null) && (vpath.length == 1)) {
                    var item = (cond_match.length > 1) ? cond_match[1] : vpath[0];
                    var label = null;

                    var item_title = item;
                    if (!template['control_set'].hasOwnProperty(item_title)) {
                        var control = {title: item_title, url: url, iconCls: 'cliqz-fa fa-database'};
                        template['control'].push(control);
                        template['control_set'][item_title] = true;
                    }

                }
                else if ((vpath[1] == 'projects') && (vpath.length == 3)) {
                    var item = vpath[0];
                    var label = CliqzUtils.getLocalizedString('Projects');

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], 'labelUrl': domain+'/'+vpath[0], color: COLORS[next_color], label_set: {}, iconCls: 'cliqz-fa fa-folder'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var item_title = title;
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
                else if ((vpath[1] == 'people') && (vpath.length == 3)) {
                    var item = vpath[0];
                    var label = CliqzUtils.getLocalizedString('People');

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], 'labelUrl': domain+'/'+vpath[0]+'/'+vpath[1], color: COLORS[next_color], label_set: {}, iconCls: 'cliqz-fa fa-user'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var item_title = title;
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
            }

            CliqzUtils.log(JSON.stringify(template), CliqzClusterHistory.LOG_KEY);
            return template;
        }
    },
    'youtube.com': {
        fun: function(urls) {

            var site = 'Youtube';
            var template = {
                summary: CliqzUtils.getLocalizedString('Sitemap_Summary').replace('{}', site),
                control: [{title: CliqzUtils.getLocalizedString('Sitemap_Youtube_Popular'), url: 'http://www.youtube.com/channel/UCK274iXLZhs8MFGLsncOyZQ', iconCls: 'null'},
                          {title: CliqzUtils.getLocalizedString('Sitemap_Youtube_Subscriptions'), url: 'http://www.youtube.com/feed/subscriptions/', iconCls: 'null'},
                          {title: CliqzUtils.getLocalizedString('Sitemap_Youtube_History'), url: 'http://www.youtube.com/feed/history/', iconCls: 'null'},
                          {title: CliqzUtils.getLocalizedString('Sitemap_Youtube_WatchLater'), url: 'http://www.youtube.com/playlist?list=WL', iconCls: 'null'}],
                control_set: {},
                topics: [],
                url: 'http://youtube.com'
            };

            var next_color = 0;
            var cond_match = null;  // For groups in regex conditions

            for(let i=0; i<urls.length;i++) {
                var url = urls[i]['value'];
                var title = urls[i]['comment'];

                var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                    domain = urlDetails.host,
                    path = urlDetails.path;
                var dpath = domain.toLowerCase().split('.');
                dpath.reverse();
                var vpath = path.toLowerCase().split('/');

                // remove last element if '', that means that path ended with /
                // also remove first element if '',

                if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);

                if (vpath[0] == 'user') {
                    var item = vpath[1];
                    var label = CliqzUtils.getLocalizedString('Sitemap_Youtube_Channels');

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], color: COLORS[next_color], label_set: {}, iconCls: 'null'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var item_title = item;
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
            }

            CliqzUtils.log(JSON.stringify(template), CliqzClusterHistory.LOG_KEY);
            return template;
        }
    },
    'twitter.com': {
        fun: function(urls) {

            var site = 'Twitter';
            var template = {
                summary: CliqzUtils.getLocalizedString('Sitemap_Summary').replace('{}', site),
                control: [{title: CliqzUtils.getLocalizedString('Suchen'), url: 'http://search.twitter.com/', iconCls: 'cliqz-fa fa-search'},
                          {title: CliqzUtils.getLocalizedString('Entdecken'), url: 'http://twitter.com/i/discover', iconCls: 'cliqz-fa fa-lightbulb-o'}],
                control_set: {},
                topics: [],
                url: 'http://twitter.com/'
            };

            var next_color = 0;
            var cond_match = null;  // For groups in regex conditions

            for(let i=0; i<urls.length;i++) {
                var url = urls[i]['value'];
                var title = urls[i]['comment'];

                var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                    domain = urlDetails.host,
                    path = urlDetails.path;
                var dpath = domain.toLowerCase().split('.');
                dpath.reverse();
                var vpath = path.toLowerCase().split('/');

                // remove last element if '', that means that path ended with /
                // also remove first element if '',

                if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);

                if ((vpath[0] == 'settings') || (vpath[0] == 'i') || (/^search/.test(vpath[0]))) {


                }
                else if (vpath.length == 1) {
                    var item = vpath[0];
                    var label = CliqzUtils.getLocalizedString('Leute');

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], color: COLORS[next_color], label_set: {}, iconCls: 'cliqz-fa fa-user'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var item_title = item;
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
            }

            CliqzUtils.log(JSON.stringify(template), CliqzClusterHistory.LOG_KEY);
            return template;
        }
    },
    'de.wikipedia.org': {
        fun: function(urls) {

            var site = 'Wikipedia';
            var template = {
                summary: CliqzUtils.getLocalizedString('Sitemap_Summary').replace('{}', site),
                control: [],
                control_set: {},
                topics: [],
                url: 'http://de.wikipedia.org/'
            };

            var next_color = 0;
            var cond_match = null;  // For groups in regex conditions

            for(let i=0; i<urls.length;i++) {
                var url = urls[i]['value'];
                var title = urls[i]['comment'];

                var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                    domain = urlDetails.host,
                    path = urlDetails.path;
                var dpath = domain.toLowerCase().split('.');
                dpath.reverse();
                var vpath = path.toLowerCase().split('/');

                // remove last element if '', that means that path ended with /
                // also remove first element if '',

                if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);

                if (vpath.length == 2) {
                    var item = decodeURIComponent(vpath[1]);
                    // var label = CliqzUtils.getLocalizedString('People');
                    var label = CliqzUtils.getLocalizedString(vpath[0])

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], color: COLORS[next_color], label_set: {}, iconCls: 'cliqz-fa fa-user'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var item_title = item;
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
            }

            CliqzUtils.log(JSON.stringify(template), CliqzClusterHistory.LOG_KEY);
            return template;
        }
    },
    'ebay.de': {
        fun: function(urls) {

            var site = 'Ebay';
            var template = {
                summary: CliqzUtils.getLocalizedString('Sitemap_Summary').replace('{}', site),
                control: [{title: CliqzUtils.getLocalizedString('Sitemap_Ebay_MyEbay'), url: 'http://my.ebay.de', iconCls: 'null'},
                          {title: CliqzUtils.getLocalizedString('Sitemap_Ebay_Deals'), url: 'http://www.ebay.de/rpp/deals', iconCls: 'null'}],
                control_set: {},
                topics: [],
                url: 'http://www.ebay.de'
            };

            var next_color = 0;
            var cond_match = null;  // For groups in regex conditions

            for(let i=0; i<urls.length;i++) {
                var url = urls[i]['value'];
                var title = urls[i]['comment'];

                var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                    domain = urlDetails.host,
                    path = urlDetails.path;
                var dpath = domain.toLowerCase().split('.');
                dpath.reverse();
                var vpath = path.toLowerCase().split('/');

                // remove last element if '', that means that path ended with /
                // also remove first element if '',

                if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);

                if ((vpath[0] == 'usr' && vpath.length > 1 && (cond_match = vpath[1].match(/^([^?]+)/)) != null) && (vpath.length == 2)) {
                    var item = (cond_match.length > 1) ? cond_match[1] : vpath[1];
                    var label = CliqzUtils.getLocalizedString('Sitemap_Ebay_Shops');

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], color: COLORS[next_color], label_set: {}, iconCls: 'null'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var item_title = item;
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
            }

            CliqzUtils.log(JSON.stringify(template), CliqzClusterHistory.LOG_KEY);
            return template;
        }
    },
    'amazon.de': {
        fun: function(urls) {

            var site = 'Amazon';
            var template = {
                summary: CliqzUtils.getLocalizedString('Sitemap_Summary').replace('{}', site),
                control: [{title: CliqzUtils.getLocalizedString('Sitemap_Amazon_MyAmazon'), url: 'https://www.amazon.de/gp/yourstore/home', iconCls: 'null'},
                          {title: CliqzUtils.getLocalizedString('Sitemap_Amazon_MyAccount'), url: 'https://www.amazon.de/gp/css/homepage.html', iconCls: 'null'},
                          {title: CliqzUtils.getLocalizedString('Sitemap_Amazon_Wishlist'), url: 'http://www.amazon.de/gp/registry/wishlist', iconCls: 'null'}],
                control_set: {},
                topics: [],
                url: 'http://www.amazon.de'
            };

            var next_color = 0;
            var cond_match = null;  // For groups in regex conditions

            for(let i=0; i<urls.length;i++) {
                var url = urls[i]['value'];
                var title = urls[i]['comment'];

                var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                    domain = urlDetails.host,
                    path = urlDetails.path;
                var dpath = domain.toLowerCase().split('.');
                dpath.reverse();
                var vpath = path.toLowerCase().split('/');

                // remove last element if '', that means that path ended with /
                // also remove first element if '',

                if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);

                if (vpath[1] == 'b') {
                    var item = null;
                    var label = CliqzUtils.getLocalizedString('Sitemap_Amazon_Categories');

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], color: COLORS[next_color], label_set: {}, iconCls: 'null'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var title_match = title.match(/(?:^[Aa]mazon.de.*?:\s*)?(.+)/);
                    if (title_match != null && title_match.length > 1) {
                        var item_title = title_match[1];
                    } else {
                        var item_title = title;
                    }
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
                else if (vpath[0] == 'gp' && vpath[1] == 'aag' && /(seller|merchant)=/.test(vpath[2])) {
                    var item = null;
                    var label = CliqzUtils.getLocalizedString('Sitemap_Amazon_Shops');

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], color: COLORS[next_color], label_set: {}, iconCls: 'null'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var title_match = title.match(/(?:^[Aa]mazon.de.*?:\s*)?(.+)/);
                    if (title_match != null && title_match.length > 1) {
                        var item_title = title_match[1];
                    } else {
                        var item_title = title;
                    }
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
            }

            CliqzUtils.log(JSON.stringify(template), CliqzClusterHistory.LOG_KEY);
            return template;
        }
    },
    'github.com': {
        fun: function(urls) {
            var site = 'GitHub';
            var template = {
                summary: CliqzUtils.getLocalizedString('Sitemap_Summary').replace('{}', site),
                control: [{title: CliqzUtils.getLocalizedString('Settings'), url: 'http://github.com/settings/', iconCls: 'cliqz-fa fa-bars'}],
                control_set: {},
                topics: [],
                url: 'http://github.com/'
            };

            var next_color = 0;
            var cond_match = null;  // For groups in regex conditions

            for(let i=0; i<urls.length;i++) {
                var url = urls[i]['value'];
                var title = urls[i]['comment'];

                var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                    domain = urlDetails.host,
                    path = urlDetails.path;
                var dpath = domain.toLowerCase().split('.');
                dpath.reverse();
                var vpath = path.toLowerCase().split('/');

                // remove last element if '', that means that path ended with /
                // also remove first element if '',

                if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);

                if (vpath[0] == 'settings') {


                }
                else if (vpath.length == 2) {
                    var item = vpath[1];
                    var label = vpath[0];

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], 'labelUrl': domain+'/'+vpath[0], color: COLORS[next_color], label_set: {}, iconCls: 'cliqz-fa fa-database'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var item_title = item;
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
            }

            CliqzUtils.log(JSON.stringify(template), CliqzClusterHistory.LOG_KEY);
            return template;
        }
    },
    'facebook.com': {
        fun: function(urls) {

            var site = 'Facebook';
            var template = {
                summary: CliqzUtils.getLocalizedString('Sitemap_Summary').replace('{}', site),
                control: [{title: CliqzUtils.getLocalizedString('Sitemap_Facebook_Newsfeed'), url: 'https://www.facebook.com/?sk=nf', iconCls: 'null'},
                          {title: CliqzUtils.getLocalizedString('Sitemap_Facebook_Messages'), url: 'https://www.facebook.com/messages', iconCls: 'null'},
                          {title: CliqzUtils.getLocalizedString('Sitemap_Facebook_Events'), url: 'https://www.facebook.com/events/upcoming', iconCls: 'null'},
                          {title: CliqzUtils.getLocalizedString('Sitemap_Facebook_Help'), url: 'https://www.facebook.com/help', iconCls: 'null'}],
                control_set: {},
                topics: [],
                url: 'http://www.facebook.com'
            };

            var next_color = 0;
            var cond_match = null;  // For groups in regex conditions

            for(let i=0; i<urls.length;i++) {
                var url = urls[i]['value'];
                var title = urls[i]['comment'];

                var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                    domain = urlDetails.host,
                    path = urlDetails.path;
                var dpath = domain.toLowerCase().split('.');
                dpath.reverse();
                var vpath = path.toLowerCase().split('/');

                // remove last element if '', that means that path ended with /
                // also remove first element if '',

                if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);

                if ((/^login/.test(vpath[0])) || (/^messages/.test(vpath[0])) || (/^events/.test(vpath[0])) || (/^help/.test(vpath[0])) || (/^settings/.test(vpath[0])) || (/^robots[.]txt/.test(vpath[0]))) {


                }
                else if ((vpath.length > 0 && (cond_match = vpath[0].match(/^([^?]+)/)) != null) && (vpath.length == 1)) {
                    var item = (cond_match.length > 1) ? cond_match[1] : vpath[0];
                    var label = CliqzUtils.getLocalizedString('Sitemap_Facebook_Pages');

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], color: COLORS[next_color], label_set: {}, iconCls: 'null'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var item_title = item;
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
                else if (vpath[0] == 'groups') {
                    var item = null;
                    var label = CliqzUtils.getLocalizedString('Sitemap_Facebook_Groups');

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], color: COLORS[next_color], label_set: {}, iconCls: 'null'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var item_title = title;
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
                else if (vpath[0] == 'lists') {
                    var item = null;
                    var label = CliqzUtils.getLocalizedString('Sitemap_Facebook_Lists');

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], color: COLORS[next_color], label_set: {}, iconCls: 'null'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var item_title = title;
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
            }

            CliqzUtils.log(JSON.stringify(template), CliqzClusterHistory.LOG_KEY);
            return template;
        }
    },
    'klout.com': {
        fun: function(urls) {

            var site = 'Klout';
            var template = {
                summary: CliqzUtils.getLocalizedString('Sitemap_Summary').replace('{}', site),
                control: [],
                control_set: {},
                topics: [],
                url: 'http://klout.com/'
            };

            var next_color = 0;
            var cond_match = null;  // For groups in regex conditions

            for(let i=0; i<urls.length;i++) {
                var url = urls[i]['value'];
                var title = urls[i]['comment'];

                var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                    domain = urlDetails.host,
                    path = urlDetails.path;
                var dpath = domain.toLowerCase().split('.');
                dpath.reverse();
                var vpath = path.toLowerCase().split('/');

                // remove last element if '', that means that path ended with /
                // also remove first element if '',

                if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);

                if ((vpath[0] == 'settings') || (vpath[0] == 'i') || (vpath[0] == 'search') || (vpath[0] == 'register') || (vpath[0] == 'dashboard')) {


                }
                else if (vpath.length == 1) {
                    var item = vpath[0];
                    var label = CliqzUtils.getLocalizedString('People');

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], color: COLORS[next_color], label_set: {}, iconCls: 'cliqz-fa fa-user'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var item_title = item;
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
            }

            CliqzUtils.log(JSON.stringify(template), CliqzClusterHistory.LOG_KEY);
            return template;
        }
    },
    'chefkoch.de': {
        fun: function(urls) {

            var site = 'Chefkoch';
            var template = {
                summary: CliqzUtils.getLocalizedString('Sitemap_Summary').replace('{}', site),
                control: [{title: CliqzUtils.getLocalizedString('Sitemap_Chefkoch_Magazin'), url: 'http://www.chefkoch.de/magazin/', iconCls: 'null'},
                          {title: CliqzUtils.getLocalizedString('Sitemap_Chefkoch_Rezepte'), url: 'http://www.chefkoch.de/rezepte/', iconCls: 'null'},
                          {title: CliqzUtils.getLocalizedString('Sitemap_Chefkoch_Community'), url: 'http://www.chefkoch.de/forum/', iconCls: 'null'},
                          {title: CliqzUtils.getLocalizedString('Sitemap_Chefkoch_Blog'), url: 'http://www.chefkoch-blog.de/', iconCls: 'null'}],
                control_set: {},
                topics: [],
                url: 'http://www.chefkoch.de'
            };

            var next_color = 0;
            var cond_match = null;  // For groups in regex conditions

            for(let i=0; i<urls.length;i++) {
                var url = urls[i]['value'];
                var title = urls[i]['comment'];

                var urlDetails = CliqzUtils.getDetailsFromUrl(url),
                    domain = urlDetails.host,
                    path = urlDetails.path;
                var dpath = domain.toLowerCase().split('.');
                dpath.reverse();
                var vpath = path.toLowerCase().split('/');

                // remove last element if '', that means that path ended with /
                // also remove first element if '',

                if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
                if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

                CliqzUtils.log(JSON.stringify([url, path, vpath]), CliqzClusterHistory.LOG_KEY);

                if (vpath[0] == 'rezepte' && /[\d]+/.test(vpath[1])) {
                    var item = null;
                    var label = CliqzUtils.getLocalizedString('Sitemap_Chefkoch_Rezepte');

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], 'labelUrl': domain+'/'+vpath[0], color: COLORS[next_color], label_set: {}, iconCls: 'null'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var title_match = title.match(/(.+?)(?:\s*von.*?)?(?:\s*\|\s*Chefkoch[.]de.*)/);
                    if (title_match != null && title_match.length > 1) {
                        var item_title = title_match[1];
                    } else {
                        var item_title = title;
                    }
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
                    }
                }
                else if (vpath[0] == 'magazin' && vpath[1] == 'artikel') {
                    var item = null;
                    var label = CliqzUtils.getLocalizedString('Sitemap_Chefkoch_Articles');

                    // Check if the first level (label) exists
                    var topic = null
                    for(let j=0; j<template['topics'].length; j++) {
                        if (template['topics'][j]['label']==label) topic = template['topics'][j];
                    }

                    // if the topic did not exist, we must create it
                    if ((topic==null) && (template['topics'].length<4)) {
                        topic = {'label': label, urls: [], 'labelUrl': domain+'/'+vpath[0], color: COLORS[next_color], label_set: {}, iconCls: 'null'};
                        template['topics'].push(topic);
                        next_color = (next_color+1)%COLORS.length;
                    }

                    var title_match = title.match(/(.+?)(?:\s*\|\s*Chefkoch[.]de.*)/);
                    if (title_match != null && title_match.length > 1) {
                        var item_title = title_match[1];
                    } else {
                        var item_title = title;
                    }
                    if (topic!=null && !topic['label_set'].hasOwnProperty(item_title)) {
                        topic['urls'].push({href: url, path: path, title: item_title})
                        topic['label_set'][item_title] = true;
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

    /**
     * Tries to cluster the history.
     *
     * @return <tt>[is_clustered, filtered_history]</tt>: if the history could
     *         be clustered, @c is_clustered will be true and
     *         @c filtered_history will contain all the items in the history
     *         that do not lead to the clustered domain; otherwise, we return
     *         @c false and the full history.
     */
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
        var historyTransRemained = [];
        let j = 0;
        for (let i=0; i<freqHash[maxDomain].length; i++) {
            for (; j <= freqHash[maxDomain][i]; j++) {
                if (j < freqHash[maxDomain][i]) {
                    historyTransRemained.push(historyTrans[j]);
                } else {
                    historyTransFiltered.push(historyTrans[j]);
                }
            }
        }
        while (j < historyTrans.length) {
            historyTransRemained.push(historyTrans[j]);
            j++;
        }

        // has templates? if not quit and do the normal history, if so, then convert the maxDomain
        // to sitemap. This check is done again within CliqzClusterHistory.collapse but it's better to do
        // it twice so that we can avoid doing the filtering by now.
        if (templates[maxDomain] == null && q.length <= 6 && q.length > 1) {
            CliqzUtils.log('test', 'series')
            var seriesClusteredHistory2 = CliqzClusterSeries.collapse(historyTransFiltered, cliqzResults, q);
        }

        else if (templates[maxDomain]==null && q.length > 6) {
            // in principle there is not template, but we must check for the possibility that falls to a
            // misc category,

            var seriesClusteredHistory = CliqzClusterSeries.collapse(historyTransFiltered, cliqzResults, q);
            if (seriesClusteredHistory) {
                historyTransFiltered[0]['data'] = seriesClusteredHistory;
                historyTransFiltered[0]['style'] = 'cliqz-series';
                var v = [true, [historyTransFiltered[0]].concat(historyTransRemained)];

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
            var v = [true, [historyTransFiltered[0]].concat(historyTransRemained)];

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

