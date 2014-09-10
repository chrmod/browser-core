'use strict';

var EXPORTED_SYMBOLS = ['CliqzHistoryManager'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/PlacesUtils.jsm")
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Promise',
  'chrome://cliqzmodules/content/extern/Promise.jsm');


XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.5.04');

var CliqzHistoryManager = {
	_db: null,
    getStats: function(callback){
        let historysize = 0;
        let daysVisited = {};
        let visitedDomainOn = {};
        let visitedSubDomain = {};
        let today = CliqzUtils.getDay();
        let history = today;

        this.PlacesInterestsStorage
            ._execute(
                "SELECT count(*) cnt, MIN(v.visit_date) first " +
                "FROM moz_historyvisits v " +
                "JOIN moz_places h " +
                "ON h.id = v.place_id " +
                "WHERE h.hidden = 0 AND h.visit_count > 0 ",
                {
                    columns: ["cnt", "first"],
                    onRow: function({cnt, first}) {
                        try {
                            history = Math.floor(first / 86400000000);
                            historysize = cnt;
                        }
                        catch(ex) {}
                    }
                }
            )
            .then(function() {
                callback({
                    size: historysize,
                    days: CliqzUtils.getDay() - history
                });
            });
    },
    //getModel: function(cliqzQuery, callback){
    getHistoryModel: function(mainCallback){

        function vecDotProduct(vecA, vecB) {
            var product = 0;
            for (var i = 0; i < vecA.length; i++) {
                product += vecA[i] * vecB[i];
            }
            return product;
        };
         
        // Vector length
        function vecMagnitude(vec) {
            var sum = 0;
            for (var i = 0; i < vec.length; i++) {
                sum += vec[i] * vec[i];
            }
            return Math.sqrt(sum);
        };
         
        // Cosine similarity
        function cosineSimilarity(vecA, vecB) {
                return vecDotProduct(vecA, vecB) / (vecMagnitude(vecA) * vecMagnitude(vecB));
        };

        // Normalize a word
        function normalize(word) {
            return word.toLowerCase().replace(/[^\w]/g, "");
        };

        // Tokenize a doc
        function tokenize(doc) {
            return doc.split(/[\s_():.!?,;%#]+/);
        };

        function myreduce(previous, current, index, array) {
            if(!(current in previous)) {
                previous[current] = 1 / array.length;
            } else {
                previous[current] += 1 / array.length;
            }
            return previous;
        };

        // Text frequency
        function tf(words, stopWords) {
            return words
                // Normalize words
                .map(normalize)
                // Filter out stop words and short words
                .filter(function(word) {
                    return word.length > 1 && (!stopWords || !~stopWords.indexOf(word));
                })
                // Reduce
                .reduce(myreduce, {});
        };

        // Inverse document frequency
        function idf(D, dted) {
            return Math.log(D / (1 + dted)) / Math.log(10);
        };

        // Main entry point, load the corpus and return an object
        // which can calculate the tfidf for a certain doc
        function buildTfidfModel(corpus, _stopWords) {
            var
                // Total number of (unique) documents
                D = 0,
                // Number of documents containing the term
                dted = {},
                // Keep our calculated text frequencies
                docs = {},
                // Normalized stop words
                stopWords;

            if(_stopWords) stopWords = _stopWords.map(normalize);

            // Key the corpus on their md5 hash
            function hash(doc) {
                return doc.split("").reduce(
                            function(a, b) {
                                a=((a<<5)-a)+b.charCodeAt(0);
                                return a&a
                            }, 0);
            }

            function add(h, doc) {
                // One more document
                D++;
                // Calculate and store the term frequency
                docs[h] = tf(tokenize(doc), stopWords);
                // Update number of documents with term
                for(var term in docs[h]) {
                    if(!(term in dted)) dted[term] = 0;
                    dted[term]++;
                }
            }

            function toBinVector(doc_tf) {
                var vec = [];
                for (var term in dted) {
                    if (doc_tf[term]) {
                        vec.push(doc_tf[term]*Object.keys(doc_tf).length);
                    } else vec.push(0);
                }
                return vec;
            }

            //if(!(corpus instanceof Array)) {
            //    // They are loading a previously analyzed corpus
            //    var data = corpus instanceof Object ? corpus : JSON.parse(corpus);
            //    D = data.D;
            //    dted = data.dted;
            //    docs = data.docs;
            //} else {
            // They are loading a term and a corpus
            for(var i = 0, l = corpus.length; i < l; i++) {
                var doc = corpus[i],
                    h = hash(doc);

                // Add the document if it's new to us
                if(!(h in docs)) {
                    add(h, doc);
                }
            }

            return {
                similarity: function (doc) {
                    var dh = hash(doc),
                        doc_tf = tf(tokenize(doc), stopWords),
                        doc_vec = toBinVector(doc_tf),
                        scores = [];

                    for (var h in docs) {
                        var vec = toBinVector(docs[h]);
                        var sim = cosineSimilarity(doc_vec, vec)
                        scores.push(isNaN(sim) ? 0 : sim);
                    }
                    // If it's a new document, add it
                    //if(!(dh in docs)) {
                    //    add(dh, doc);
                    //}
                    return Math.max.apply(null, scores);
                }
            };
        };

        function modelFromHistoryQueries(callback) {
            let urls = [];
            CliqzHistoryManager.PlacesInterestsStorage
                ._execute(
                    "SELECT moz_places.url FROM moz_places " +
                    "WHERE (url LIKE '%search?q=%' OR url LIKE '%search?p=%' OR url LIKE '%results.aspx?q=%' OR " +
                    "url LIKE '%web?q=%' OR url LIKE '%google.de/#q=%' OR url LIKE '%#q=%' OR url LIKE '%duckduckgo.com/?q=%')",
                    {
                        columns: ["url"],
                        onRow: function(url) {
                            urls.push(url);
                        }
                    }
                )
                .then(function() { callback(urls); });
        };

        // build a model from the histry queries
        function getTfidfModel(callback) {
            function getQueries(urls) {
                var regex = /[\?#]{1}[pq]{1}=(.+)/;
                var queries = [];
                for (var i = 0; i < urls.length; i++) {
                    var m = urls[i].match(regex);
                    if (m) {
                        var q = m[1].split("&")[0];
                        q = q.replace(/\+/g, " ").replace(/%20/g, " ");
                        queries.push(q);
                    }
                }
                return queries;
            };
            function buildModel(docs) {
                var stop = ["the", "a"];
                var model = buildTfidfModel(docs, stop);
                return callback(model);
            }
            return modelFromHistoryQueries(function(urls) { buildModel(getQueries(urls)); });
        };

        getTfidfModel(mainCallback);
    },
	PlacesInterestsStorage: {
        _execute: function PIS__execute(sql, optional={}) {
            let {columns, key, listParams, onRow, params} = optional;

            // Convert listParams into params and the desired number of identifiers
            if (listParams != null) {
                params = params || {};
                Object.keys(listParams).forEach(function(listName) {
                  let listIdentifiers = [];
                  for (let i = 0; i < listParams[listName].length; i++) {
                    let paramName = listName + i;
                    params[paramName] = listParams[listName][i];
                    listIdentifiers.push(":" + paramName);
                  }

                  // Replace the list placeholders with comma-separated identifiers
                  sql = sql.replace(":" + listName, listIdentifiers, "g");
                });
            }

            // Initialize the statement cache and the callback to clean it up
            if (this._cachedStatements == null) {
                this._cachedStatements = {};
                PlacesUtils.registerShutdownFunction(function() {
                  Object.keys(this._cachedStatements).forEach(function(key)  {
                    this._cachedStatements[key].finalize();
                  });
                });
            }

            // Use a cached version of the statement if handy; otherwise created it
            let statement = this._cachedStatements[sql];
            if (statement == null) {
                this._db = this._db || PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
                statement = this._db.createAsyncStatement(sql);
                this._cachedStatements[sql] = statement;
            }

            // Bind params if we have any
            if (params != null) {
                Object.keys(params).forEach(function(param)  {
                  statement.bindByName(param, params[param]);
                });
            }

            // Determine the type of result as nothing, a keyed object or array of columns
            let results;
            if (onRow != null) {}
            else if (key != null) {
                results = {};
            }
            else if (columns != null) {
                results = [];
            }

            // Execute the statement and update the promise accordingly
            let deferred = Promise.defer();
            statement.executeAsync({
                handleCompletion: function(reason)  {
                  deferred.resolve(results);
                },

                handleError: function(error)  {
                  deferred.reject(new Error(error.message));
                },

                handleResult: function(resultSet)  {
                  let row;
                  while (row = resultSet.getNextRow()) {
                    // Read out the desired columns from the row into an object
                    let result;
                    if (columns != null) {
                      // For just a single column, make the result that column
                      if (columns.length == 1) {
                        result = row.getResultByName(columns[0]);
                      }
                      // For multiple columns, put as valyes on an object
                      else {
                        result = {};
                        columns.forEach(function(column) {
                          result[column] = row.getResultByName(column);
                        });
                      }
                    }

                    // Give the packaged result to the handler
                    if (onRow != null) {
                      onRow(result);
                    }
                    // Store the result keyed on the result key
                    else if (key != null) {
                      results[row.getResultByName(key)] = result;
                    }
                    // Append the result in order
                    else if (columns != null) {
                      results.push(result);
                    }
                  }
                }
            });

            return deferred.promise;
        }
    }
};

CliqzHistoryManager.getHistoryModel(function(model) {
    CliqzHistoryManager.historyModel = model;
});
