'use strict';
/* Cliqz auto suggestion 
*/

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

var EXPORTED_SYMBOLS = ['CliqzAutosuggestion'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(
    this, 'CliqzUtils', 'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(
    this, 'CliqzHistory', 'chrome://cliqzmodules/content/CliqzHistory.jsm');

var CliqzAutosuggestion = CliqzAutosuggestion || {
    dbFile: FileUtils.getFile("ProfD", ["cliqz_query.sqlite"]),
    CliqzTrieCount: 0,
    notExpandTo: {},  // this is a list user don't like, try not to autocomplete until next time
    active: false,
    init: function() {
        CliqzAutosuggestion.initTrie();
        CliqzAutosuggestion.userTrie = new CliqzAutosuggestion.Trie();
        CliqzAutosuggestion.CliqzTrie = new CliqzAutosuggestion.Trie();
        // CliqzAutosuggestion.TrendingTrie = new CliqzAutosuggestion.Trie();  // we can add trending, ads, etc here
        this.initDB();
    },
    initDB: function() {
        if (this.dbFile.exists()) {
            this.loadDB();
            return;
        }
        let sql = "create table query(q VARCHAR(255) PRIMARY KEY NOT NULL, c INTEGER);";
        this.SQL._execute(Services.storage.openDatabase(this.dbFile), sql);
        this.collectPast();
    },
    loadDB: function() {
        let sql = "select q, c from query";
        this.SQL._execute(Services.storage.openDatabase(this.dbFile), sql, null, ['q', 'c'],
                          function(x) CliqzAutosuggestion.userTrie.incr(x.q, x.c));
    },
    collectPast: function() {
        let sql = "select url from moz_places";
        this.SQL._execute(Services.storage.openDatabase(FileUtils.getFile("ProfD", ["places.sqlite"])),
                          sql, null, ['url'], this.extractQuery);
    },
    extractQuery: function(res) {
        let url = res.url;
        // find google query
        CliqzUtils.log("try to extract query from: " +  url);
        let requery = /\.google\..*?[#?&;]q=[^$&]+/;
        let reref = /\.google\..*?\/(?:url|aclk)\?/;
        if (requery.test(url) && !reref.test(url)) {
            if (url.indexOf('#') > -1)
                url = '#' + url.split('#')[1];
            let query = url.match(/[f#?&;]q=([^$&]+)/)[1];
            query = decodeURIComponent(query.replace(/\+/g, ' '));
            CliqzAutosuggestion.userTrie.incr(query);
            CliqzAutosuggestion.insertDB(query);
        }
    },
    insertDB: function(query) {  // save user typed query to sqlite
        let sql = "insert or replace into query (q, c) values" +
                "(:query, coalesce((select c + 1 from query where q = :query), 1));";
        this.SQL._execute(Services.storage.openDatabase(this.dbFile),
                          sql, {query: this.SQL._escape(query)});
    },
    Trie: function(stem, maxCount) {
        this.stem = stem || "";
        this.children = [];
        this.maxCount = maxCount || 0;
        this.totalCount = 0;
        this.wordEnd = false;
    },
    initTrie: function() {
        CliqzAutosuggestion.Trie.prototype = {
            walker: function(word, trie, method) {
                if (!word || !trie || !method)
                    return null;
                let ch, c, i, prev;
                while (word.length > 0) {
                    ch = word.charAt(0);
                    c = trie.children;
                    for (i=0; i < c.length; ++i)
                        if (ch == c[i].stem)
                            break;
                    if (i == c.length)  // not found
                        return null;
                    word = word.substring(1);
                    prev = trie;
                    trie = c[i];
                }
                return method(prev, i);
            },
            add: function(word, maxCount, count) {
                this.maxCount = Math.max(this.maxCount, maxCount);
                this.totalCount += count;
                if (word.length==0) {
                    this.wordEnd = true;
                }
                if (word) {
                    let trie, k = word.charAt(0), children = this.children;
                    for (let i = 0; i < children.length; ++i) {
                        if (children[i].stem == k) {
                            trie = children[i];
                            break;
                        }
                    }
                    if (!trie) {
                        trie = new CliqzAutosuggestion.Trie(k, maxCount);
                        children.push(trie);
                        // TODO: sort children by maxCount
                    }
                    trie.add(word.substring(1), maxCount, count);
                } 
            },
            incr: function(word, n=1) {
                let _count = this.walker(word, this, function(trie, idx) {
                    return trie.children[idx].maxCount;
                });
                let maxCount;
                if (this.exists(word))
                    maxCount = _count + n;
                else
                    maxCount = n;
                this.add(word, maxCount, n);
            },
            exists: function(word) {
                return this.walker(word, this, function(trie, idx) {
                    return trie.children[idx].wordEnd;
                });
            },
            findMax: function(prefix) {
                return this.walker(prefix, this, function(trie, idx) {
                    let cTrie = trie.children[idx];
                    let _count = cTrie.maxCount;
                    let _total = cTrie.totalCount;
                    while (cTrie.children.length > 0) {
                        let found = false;
                        for (let i = 0; i < cTrie.children.length; i++) {
                            if (cTrie.children[i].maxCount == _count) {
                                cTrie = cTrie.children[i];
                                prefix += cTrie.stem;
                                found = true;
                                break;
                            }
                        }
                        if (!found)  // the rest are with different count
                            break;
                    }
                    let childrenCount = 0;
                    for (let i = 0; i < cTrie.children.length; i++) {
                        childrenCount += cTrie.children[i].totalCount;
                    }
                    return {word: prefix, count: _count,
                            total: _total, childrenCount: childrenCount};
                });
            }
        };
    },
    findSuggestion: function(pq) {
        let res, fullExpansion = false;
        let resUser = CliqzAutosuggestion.userTrie.findMax(pq);
        let resCliqz = CliqzAutosuggestion.CliqzTrie.findMax(pq);

        if (resUser && resUser.count >= 3 &&
            resUser.count / resUser.total > 0.4 ) {
                return resUser.word;
            }
        if (resCliqz && (resCliqz.count + resCliqz.childrenCount) / resCliqz.total > 0.65 &&
            resCliqz.count > 15) {
            return resCliqz.word;
        }
        return pq;
    },
    SQL: {
        _execute: function(conn, sql, param, columns, onRow) {
            var sqlStatement = conn.createAsyncStatement(sql);
            if (param)
                for (var key in param)
                    sqlStatement.params[key] = param[key];
            sqlStatement.executeAsync({
                handleResult: function(aResultSet) {
                    for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                        let result = {};
                        if (columns != null) {
                            for (let i=0; i<columns.length; i++) {
                                result[columns[i]] = row.getResultByName(columns[i]);
                            }
                        }
                        onRow(result);
                    }
                },
                handleError: function(aError) {
                    CliqzUtils.log("SQL Error: " + aError.message);
                    CliqzUtils.log("Error SQL: " + sql);
                },
                handleCompletion: function(aReason) {
                    CliqzUtils.log("SQL " + sql + " finished");
                }
            });
        },
        _escape: function(s) {
            return s.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function(char) {
                switch (char) {
                case "'":
                    return "''";
                default:
                    return char;
                }
            });
        }
    }
};
