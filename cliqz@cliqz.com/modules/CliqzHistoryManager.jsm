'use strict';

var EXPORTED_SYMBOLS = ['CliqzHistoryManager'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/PlacesUtils.jsm')
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzHistoryManager = {
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
            var {columns, onRow} = optional,
                conn = PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection,
                statement = conn.createAsyncStatement(sql),
                onThen, //called after the async operation is finalized
                promiseMock = {
                    then: function(func){
                        onThen = func;
                    }
                };

            statement.executeAsync({
                handleCompletion: function(reason)  {
                  onThen();
                },

                handleError: function(error)  {
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
                      // For multiple columns, put as values on an object
                      else {
                        result = {};
                        columns.forEach(function(column) {
                          result[column] = row.getResultByName(column);
                        });
                      }
                    }
                    //pass the result to the onRow handler
                    onRow(result);
                  }
                }
            });
            return promiseMock;
        }
    }
};

CliqzHistoryManager.getHistoryModel(function(model) {
    CliqzHistoryManager.historyModel = model;
});
