'use strict';
/* Cliqz auto suggestion */

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

var EXPORTED_SYMBOLS = ['CliqzAutosuggestion'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzAutosuggestion = CliqzAutosuggestion || {
    init: function() {
        CliqzAutosuggestion.initTrie();
        if (false) {
            // load from local file;
            let a = 0;
        }
        else {
            CliqzAutosuggestion.userTrie = new CliqzAutosuggestion.Trie();
        }
    },
    Trie: function(stem, maxCount) {
        this.stem = stem || "";
        this.children = [];
        this.maxCount = maxCount || 0;
    },
    save: function() {  // save user typed trie to disk
    },
    initTrie: function() {
        CliqzAutosuggestion.Trie.prototype = {
            walker: function(word, trie, method) {
                if (!word || !trie || !method)
                    return null;
                let ch, c, l, i, prev;
                while (word.length > 0) {
                    ch = word.charAt(0);
                    c = trie.children;
                    l = c.length;
                    for (i=0; i < l; ++i)
                        if (ch == c[i].stem)
                            break;
                    if (i == l)  // not found
                        return null;
                    word = word.substring(1);
                    prev = trie;
                    trie = c[i];
                }
                return method(prev, i);
            },
            add: function(word, maxCount) {
                if (word) {
                    this.maxCount = Math.max(this.maxCount, maxCount)
                    let trie, k = word.charAt(0), children = this.children, len = children.length;
                    for (let i = 0; i < len; ++i) {
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
                    trie.maxCount = Math.max(trie.maxCount, maxCount)
                    trie.add(word.substring(1), maxCount);
                }
            },
            incr: function(word, n=1) {
                let _count = this.walker(word, this, function(trie, idx) {
                    return trie.children[idx].maxCount;
                });
                let maxCount;
                if (_count)
                    maxCount = _count + n;
                else
                    maxCount = n;
                this.add(word, maxCount);
            },
            findMax: function(prefix) {
                return this.walker(prefix, this, function(trie, idx) {
                    let cTrie = trie.children[idx]
                    let _count = cTrie.maxCount;
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
                        if (!found) {
                            // should never reach here, just in case
                            CliqzUtils.log('max count not found (error)', 'AS');
                            break;
                        }
                    }
                    return prefix;
                });
            }
        }
    }
};
