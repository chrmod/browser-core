/**
TrackerTXT: caching rules for tracker.txt
 */

import MapCache from 'antitracking/fixed-size-cache';

var trackerTxtActions = new Set(['placeholder', 'block', 'empty', 'random']);

var defaultTrackerTxtRule = 'same';

var trackerRuleParser = function(str, rules) {
    /* Tracker format:
     one rule per line: "tracker: action"
     */
    str.split('\n').map(function(x) {return x.trim().split('#')[0];}).forEach(
        function(element, index, array) {
            var siteRule = element.split(':').map(function(x) {return x.trim();});
            if (siteRule.length == 2 &&
                trackerTxtActions.has(siteRule[1]))
                rules[siteRule[0]] = siteRule[1];
        }
    );
};

var sleep = function(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 10000; i++)
        if (new Date().getTime() - start > milliseconds)
            break;
};

var TrackerTXT = function(baseurl) {
    this.baseurl = baseurl;
    this.rules = {};
    this.status = null;
    this.last_update = null;
};

TrackerTXT._cache = new MapCache(function(baseurl) {return new TrackerTXT(baseurl);}, 1000);

TrackerTXT.get = function(baseurl) {
    return TrackerTXT._cache.get(baseurl);
};

TrackerTXT.prototype = {
    update: function() {
        if (this.status == 'updating' ||
            this.last_update == CliqzAttrack.getTime()) return;  // try max once per hour
        this.status = 'updating';
        var self = this;
        CliqzUtils.httpGet(
            self.baseurl + '/tracker.txt',
            function success(req) {
                trackerRuleParser(req.responseText, self.rules);
                self.status = 'updated';
                this.last_update = CliqzAttrack.getTime();
            },
            function error() {
                self.status = 'error';
                this.last_update = CliqzAttrack.getTime();
            }
        );
    }
};

export {
    TrackerTXT,
    sleep,
    defaultTrackerTxtRule
};
