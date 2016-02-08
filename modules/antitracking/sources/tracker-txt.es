/**
TrackerTXT: caching rules for tracker.txt
 */

import MapCache from 'antitracking/fixed-size-cache';
import { getTime } from 'antitracking/time';

var trackerTxtActions = new Set(['placeholder', 'block', 'empty', 'replace']);

var defaultTrackerTxtRule = 'same';

export function getDefaultTrackerTxtRule() {
    return defaultTrackerTxtRule;
};

export function setDefaultTrackerTxtRule(rule) {
    defaultTrackerTxtRule = rule;
};

var trackerRuleParser = function(str, rules) {
    /* Tracker format:
     one rule per line: "tracker: action"
     */
    str.split('\n').map(function(x) {return x.trim()}).filter(function(x) {return x[0] == 'R'}).forEach(
        function(element, index, array) {
            var siteRule = element.split(/\s+/).map(function(x) {return x.trim().toLowerCase();});
            if (siteRule.length == 3 &&
                trackerTxtActions.has(siteRule[2])) {
                rules.push({
                    site: siteRule[1],
                    rule: siteRule[2]
                });
            }
        }
    );
};

var sleep = function(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 10000; i++)
        if (Date.now() - start > milliseconds)
            break;
};

var TrackerTXT = function(baseurl) {
    this.baseurl = baseurl;
    this.rules = [];
    this.status = null;
    this.last_update = null;
};

TrackerTXT._cache = new MapCache(function(baseurl) {return new TrackerTXT(baseurl);}, 1000);

TrackerTXT.get = function(url_parts) {
    var baseurl = url_parts.protocol + '://' + url_parts.hostname + (url_parts.port !== 80 ? ':' + url_parts.port : '');
    return TrackerTXT._cache.get(baseurl);
};

TrackerTXT.prototype = {
    update: function() {
        if (this.status == 'updating' ||
            this.last_update == getTime()) return;  // try max once per hour
        this.status = 'updating';
        var self = this;
        CliqzUtils.httpGet(
            self.baseurl + '/trackering.txt',
            function success(req) {
                if (req.responseText.length < 4 * 1024) {
                    trackerRuleParser(req.responseText, self.rules);
                }
                self.status = 'updated';
                self.last_update = getTime();
            },
            function error() {
                self.status = 'error';
                self.last_update = getTime();
            }
        );
    }, 
    getRule: function(tp) {
        for (let i = 0; i < this.rules.length; i++) {
            let rule = this.rules[i];
            if (tp.endsWith(rule.site)) {
                return rule.rule
            }
        }
        return getDefaultTrackerTxtRule();
    }
};

export {
    TrackerTXT,
    sleep,
    trackerRuleParser
};
