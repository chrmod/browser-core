import pacemaker from '../pacemaker';
import * as persist from '../persistent-state';
import * as datetime from '../time';
import md5 from '../md5';
import Database from '../../core/database';
import console from '../../core/console';

/**
 * Takes a set of strings and returns an object with the set members as
 * keys and `day` as the value
 * @param  {Set<String>} tokens keys for the output object
 * @param  {String} day    values for the object
 * @return {Object}
 */
function createTokenObject(tokens, day) {
  return [...tokens].reduce((hash, tok) => {
    hash[tok] = day;
    return hash;
  }, {});
}

/**
 * Manages the local safekey list
 */
export default class {

  constructor(qsWhitelist, config) {
    this.qsWhitelist = qsWhitelist;
    this.config = config;
    this.db = new Database('cliqz-attrack-request-key-value', {auto_compaction: true});
    this.hashTokens = true;
  }

  init() {
  }

  unload() {
  }

  clearCache() {
    this._requestKeyValue.clear();
  }

  examineTokens(state) {
    // do not do anything for private tabs and non-tracker domains
    if (!state.requestContext.isChannelPrivate() && this.qsWhitelist.isTrackerDomain(state.urlParts.generalDomainHash)) {
      const day = datetime.newUTCDate();
      const today = datetime.dateString(day);
      const pruneCutoff = this.getPruneCutoff();

      const tracker = state.urlParts.generalDomainHash;
      const trackerHashLength = tracker.length;

      // create a Map of key => set(values) from the url data
      const kvs = state.urlParts.getKeyValues().filter((kv) => {
        return kv.v.length >= this.config.shortTokenLength;
      }).reduce((hash, kv) => {
        const key = this.hashTokens ? md5(kv.k) : kv.k;
        const tok = this.hashTokens ? md5(kv.v) : kv.v;
        if (!hash.has(key)) {
          hash.set(key, new Set());
        }
        hash.get(key).add(tok);
        return hash;
      }, new Map());
      const unsafeKeysSeen = new Set(kvs.keys())

      // query the db for keys for this tracker domain
      this.db.allDocs({
        include_docs: true,
        startkey: tracker,
        endkey: tracker + '\uffff',
      })

      // get rows for the keys we saw in this request
      .then((results) => {
        return results.rows.map((row) => row.doc)
          .filter((row) => unsafeKeysSeen.has(row._id.substring(trackerHashLength)))
      })
      // update rows with new data
      .then((rows) => {
        const existingRowKeys = new Set(rows.map((doc) => doc.key));
        // create documents for keys which weren't already in db
        const newDocs = Array.from(kvs.keys()).filter((key) => !existingRowKeys.has(key)).map((key) => {
          return {
            _id: `${tracker}${key}`,
            key,
            tokens: createTokenObject(kvs.get(key), today),
          }
        });
        // update existing documents with new tokens
        const updatedDocs = rows.map((doc) => {
          doc.tokens = Object.assign(doc.tokens, createTokenObject(kvs.get(doc.key), today));
          // also prune while we're here
          doc.tokens = this.pruneTokens(doc.tokens, pruneCutoff);
          return doc;
        });

        return newDocs.concat(updatedDocs);
      })
      .then((docs) => {
        // get docs over threshold which should be added to safekey list
        docs.filter((doc) => Object.keys(doc.tokens).length > this.config.safekeyValuesThreshold)
        .forEach((doc) => {
          if (this.config.debugMode) {
            console.log('Add safekey', state.urlParts.generalDomain, doc.key, doc.tokens);
          }
          this.qsWhitelist.addSafeKey(tracker, md5(doc.key), Object.keys(doc.tokens).length);
        });
        // upsert into the db
        return this.db.bulkDocs(docs);
      })
      .catch((e) => console.error('requestKeyValue update error', e));
    }
    return true;
  }

  getPruneCutoff() {
    const day = datetime.newUTCDate();
    day.setDate(day.getDate() - this.config.safeKeyExpire);
    return datetime.dateString(day);
  }

  /**
   * Prune old tokens and limit object to max 10 keys
   * @param  {Object} tokens
   * @param  {String} cutoff
   * @return {Object}
   */
  pruneTokens(tokens, cutoff) {
    let counter = 0;
    Object.keys(tokens).forEach((tok) => {
      if (counter > 10 || tokens[tok] < cutoff) {
        delete tokens[tok];
      } else {
        counter++;
      }
    });
    return tokens;
  }

}
