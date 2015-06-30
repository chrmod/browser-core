'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzClusterHistory'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');


var CliqzClusterHistory = CliqzClusterHistory || {
    LOG_KEY: 'CliqzClusterHistory',
    log: function(str) {
        CliqzUtils.log(str, CliqzClusterHistory.LOG_KEY);
    },

    all_rules: undefined,

    /**
     * Loads external data necessary for history clustering.
     */
    init: function() {
        CliqzClusterHistory.log("init");
        CliqzUtils.httpGet('chrome://cliqz/content/cluster-rules-autogenerated.json',
                function success(req){
                    CliqzClusterHistory.all_rules = JSON.parse(req.response).brands;
                },
                function error(){
                    CliqzClusterHistory.log("Could not load clustering rules file.")
                }
            );

    },

    /**
     * Tries to cluster the history.
     *
     * @return <tt>[unclustered_history, cluster_data]</tt>:
     *         @c unclustered_history will contain all the items in the history
     *         that do not lead to the clustered domain and
     *         @c cluster_data contains clustered data if clustering was triggered
     */
    cluster: function(history) {
        // returns null (do nothing) if less that 5 results from history and one domains does not take >=70%
        if (history==null)
            return [null, null];
        CliqzUtils.getWindow().console.log(history)
        var freqHash = {};
        var maxCounter = -1;
        var maxDomain = null;

        for (var i = 0; history && i < history.length; i++) {
            var urlDetails = CliqzUtils.getDetailsFromUrl(history[i].value),
                domain = urlDetails.host;

            if (freqHash[domain]==null) freqHash[domain]=[];
            freqHash[domain].push(i);

            if (freqHash[domain].length>maxCounter) {
                maxDomain = domain;
                maxCounter = freqHash[domain].length;
            }
        }

        CliqzClusterHistory.log('Trying to cluster: ' + maxDomain);

        if (history.length < 10) {
            CliqzClusterHistory.log('History cannot be clustered, matchCount < 10');
            return [history, null];
        }

        var historyFiltered = [];
        var historyRemained = [];
        var j = 0;
        for (i=0; i<freqHash[maxDomain].length; i++) {
            for (; j <= freqHash[maxDomain][i]; j++) {
                if (j < freqHash[maxDomain][i]) {
                    historyRemained.push(history[j]);
                } else {
                    historyFiltered.push( { url: history[j].value,
                                                 title: history[j].comment });
                }
            }
        }
        while (j < history.length) {
            historyRemained.push(history[j]);
            j++;
        }

        // find the first ruleset matching this domain
        var rules = undefined;
        for (var r in CliqzClusterHistory.all_rules) {
            for (var d = 0; d < CliqzClusterHistory.all_rules[r].match_domains.length; d++) {
                if (CliqzClusterHistory.all_rules[r].match_domains[d] == maxDomain) {
                    rules = CliqzClusterHistory.all_rules[r];
                    break;
                }
            }
            if (rules)
                break;
        }

        var threshold = CliqzUtils.getPref("domainClusterThreshold", 0.5)
        if (maxCounter < (history.length * threshold)) {
            CliqzClusterHistory.log('History cannot be clustered, maxCounter < belowThreshold: ' + maxCounter + ' < ' + history.matchCount * threshold);
            return [history, null];
        }

        // No rules, abort and continue history as normal
        var clusteredHistory = null;
        if (rules) {
            clusteredHistory = CliqzClusterHistory.collapse(maxDomain, rules, historyFiltered);
        }

        if (!clusteredHistory) {
            // the collapse failed, perhaps: too few data?, missing template, error?
            // if clusteredHistory return the normal history
            CliqzClusterHistory.log('History cannot be clustered, clusteredHistory is null');
            return [history, null];
        } else {
            return [historyRemained, clusteredHistory];
        }
    },
    match_url: function(cond, history) {

        var matching = [];

        for(var i = 0; i < history.length; i++) {
            // Don't ever match entries with empty title - they are probably redirects
            if(!history[i].title)
                continue;

            var url = history[i].url;
            var url_parts = CliqzUtils.getDetailsFromUrl(url);

            var matched_scheme = false,
                matched_domain = false,
                matched_path = false,
                matched_query = false,
                matched_fragment = false;

            // SCHEME
            if(!cond.scheme || url_parts.scheme.search(cond.scheme) != -1)
                matched_scheme = true;

            // DOMAIN
            if(!cond.domain || url_parts.host.search(cond.domain) != -1)
                matched_domain = true;

            // PATH
            if(!cond.path || url_parts.path.search(cond.path) != -1)
                matched_path = true;

            // QUERY
            if(!cond.query || url_parts.query.search(cond.query) != -1)
                matched_query = true;

            // FRAGMENT
            if(!cond.fragment || url_parts.fragment.search(cond.fragment) != -1)
                matched_fragment = true;

            if(matched_scheme && matched_domain && matched_path && matched_query && matched_fragment)
                matching.push(history[i]);
        }
        return matching;
    },
    extract_with_regex: function(entry, rule) {
        if(!rule)
            return undefined;

        var url_parts = CliqzUtils.getDetailsFromUrl(entry.url);

        if (typeof rule == 'string') {
            return rule;
        } else {
            if(!rule.var || !rule.pattern) {
                CliqzClusterHistory.log("Error, var and pattern required for regex rule. Ignoring: ");
                CliqzClusterHistory.log(JSON.stringify(rule));
            } else {
                var source;
                if(rule.var == 'title')
                    source = entry.title;
                else if(rule.var == 'domain')
                    source = url_parts.host;
                else if(rule.var == 'path')
                    source = url_parts.path;
                else if(rule.var == 'query')
                    source = url_parts.query;
                else if(rule.var == 'fragment')
                    source = url_parts.fragment;

                if(source) {
                    var regex = new RegExp(rule.pattern);
                    var temp = regex.exec(source);
                    if(temp) {
                        return temp[1];
                    } else {
                        return undefined;
                    }
                }
            }
        }

    },
    rewrite_url: function(entry, rule) {
        if(!rule)
            return undefined;

        // just use the static URL
        if(typeof rule == 'string') {
            return rule;
        }

        var url = entry.url;
        var url_parts = CliqzUtils.getDetailsFromUrl(url);

        function rewrite(text, pattern) {
            if(pattern == undefined)
                return text;

            if(pattern == "")
                return "";

            var regex = new RegExp(pattern);
            var temp = regex.exec(text);
            if(temp && temp.length > 1) {
                return temp[1]; // matched a group
            } else if(temp) {
                return temp[0]; // no group, return matching text
            } else {
                return pattern;
            }
        }

        // extract individual parts based on pattern in rule
        var scheme = rewrite(url_parts.scheme, rule.scheme);
        var domain = rewrite(url_parts.host, rule.domain);
        var path = rewrite(url_parts.path, rule.path);
        var query = rewrite(url_parts.query, rule.query);
        var fragment = rewrite(url_parts.fragment, rule.fragment);

        // combine them back into a full URL
        var url = scheme + "//" + domain + path;
        if(query)
            url += "?" + query;
        if(fragment)
            url += "#" + fragment;

        return url;
    },
    collapse: function(domain, definition, history) {
        CliqzClusterHistory.log('Collapsing domain: ' + domain + ' ' + history.length + ' items');

        var rules = definition.rules;

        // Step 1 - filter all history that does not match the list of domains
        // for the brand

        // already filtered in the calling function
        // TODO: check if this is reasonable, what if a brand spans multiple domains?


        // Step 2 - apply each rule in order to categorize all history items
        var category_order = [];
        var categories = {};
        for (var r = 0; r < rules.length; r++) {

            var match = rules[r].match;
            if(match) {
                var matching = CliqzClusterHistory.match_url(match, history);

                // check special case of 'always_show' rules
                if (matching.length == 0 && rules[r].always_show) {
                    var temp = {
                        url: rules[r].url,
                        title: rules[r].title
                    };
                    matching = [temp];
                }

                // finalize each matching entry by placing in a category and
                // and setting title and URL.
                for(var m = 0; m < matching.length; m++) {
                    var entry = {}

                    // get category: static or from regex
                    var category = CliqzClusterHistory.extract_with_regex(matching[m], rules[r].category);

                    if(category) {
                        // is this the first time we've seen this category?
                        if(category_order.indexOf(category) == -1) {
                            category_order.push(category);
                            categories[category] = [];
                        }

                        // assign the raw entry to the category
                        matching[m].category = category;

                        // apply title
                        var new_title = CliqzClusterHistory.extract_with_regex(matching[m], rules[r].title);
                        entry.title = new_title || matching[m].title;

                        // rewrite the url
                        var new_url = CliqzClusterHistory.rewrite_url(matching[m], rules[r].url);
                        entry.url = new_url || matching[m].url;

                        entry.old_urls = [matching[m].url];

                        categories[category].push(entry);
                    }
                }
            }
        }

        // Step 3 - place all uncategoried entries in special category
        if(category_order.indexOf('uncategorized') == -1) {
            category_order.push('uncategorized')
            categories['uncategorized'] = []
        }
        for(var i = 0; i < history.length; i++) {
            if(!history[i].category)
                categories['uncategorized'].push(history[i])
        }

        // Step 4 - check for valid config
        var base = categories.base
        if(!categories.base) {
            CliqzClusterHistory.log("Error, no base entry");
            return undefined;
        }

        // Step 5 - collapse urls with the same url together
        for(var i = 0; i < category_order.length; i++) {
            if(category_order[i] == "uncategorized")
                // don't try to collapse uncategorized entries
                continue;

            var entries = categories[category_order[i]];

            // remove entries that have the same url as a previous entry
            var keep = [];
            for(var h = 0; h < entries.length; h++) {
                var entry = undefined;
                for(var k = 0; k < keep.length; k++) {
                    if(keep[k].url == entries[h].url) {
                        entry = keep[k];
                        break;
                    }
                }
                if(entry) // found duplicate, combine them
                    entry.old_urls = entry.old_urls.concat(entries[h].old_urls);
                else
                    keep.push(entries[h]);
            }

            categories[category_order[i]] = keep;
        }

        // Step 6 - build config for display

        var data = {
            title: categories.base[0].title/* + " \u2014 " + CliqzUtils.getLocalizedString("history_results_cluster")*/,
            top_domain: domain,
            url: categories.base[0].url,
            results: [],
            control: [],
            uncategorized: [],
            excluded: []
        };

        var clean_categories = [];

        for(var c = 0; c < category_order.length; c++) {
            if(category_order[c] == 'control')
                data.control = categories[category_order[c]];
            else if(category_order[c] == 'base')
                ;
            else if(category_order[c] == 'exclude')
                data.exclude = categories[category_order[c]];
            else if(category_order[c] == 'uncategorized')
                data.uncategorized = categories[category_order[c]];
            else {
                var cat = {
                    'name': category_order[c],
                    'urls': categories[category_order[c]]
                };
                clean_categories.push(cat);
            }
        }

        // Step 6.5 - select the entries to be displayed
        //  - take a selection from each category
        var num_slots = 6;
        var slots = [];

        // Take one entry from each topic, keeping them together, until list is full
        var topic_pos = 0;
        var last_per_topic = new Array(clean_categories.length);
        while(slots.length < num_slots) {

            var done = true; // no entries left in the topics?
            for(var i = 0; i < clean_categories.length; i++) {
                if(topic_pos < clean_categories[i].urls.length) {
                    done = false;
                    var pos = slots.indexOf(last_per_topic[i]);
                    var entry = clean_categories[i].urls[topic_pos];

                    var url_parts = CliqzUtils.getDetailsFromUrl(entry.url);
                    var new_entry = {
                        favicon: '',
                        href: entry.url,
                        link: CliqzUtils.cleanUrlProtocol(CliqzHistoryPattern.simplifyUrl(url_parts.host + url_parts.extra), true),
                        domain: CliqzUtils.cleanUrlProtocol(CliqzHistoryPattern.simplifyUrl(url_parts.host), true).split("/")[0],
                        title: entry.title,
                        old_urls: entry.old_urls,
                        category: clean_categories[i].label,
                        extra: "history-" + i,
                    }

                    last_per_topic[i] = new_entry;

                    if(pos == -1) // first entry for this topic, insert at end
                        slots.push(new_entry);
                    else // insert after the previous entry from this topic
                        slots.splice(pos, 0, new_entry);
                }

            }
            if(done)
                break;

            topic_pos++;
        }

        // remove any extras
        slots = slots.slice(slots.length - num_slots);
        data.urls = slots;

        return data;
    },
};

