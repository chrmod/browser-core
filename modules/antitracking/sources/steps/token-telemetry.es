import md5 from '../md5';
import * as datetime from '../time';
import * as persist from '../persistent-state';
import { splitTelemetryData } from '../utils';
import pacemaker from '../pacemaker';
import Database from '../../core/database';
import console from '../../core/console';
import moment from '../../platform/moment';

/**
 * Add padding characters to the left of the given string.
 *
 * @param {string} str  - original string.
 * @param {string} char - char used for padding the string.
 * @param {number} size - desired size of the resulting string (after padding)
**/
function leftpad(str, char, size) {
  // This function only makes sens if `char` is a character.
  if (char.length != 1) {
    throw new Error("`char` argument must only contain one character");
  }

  if (str.length >= size) {
    return str;
  }
  else {
    return (char.repeat(size - str.length) + str);
  }
}

/**
 * Remove any trace of source domains, or hashes of source domains
 * from the data to be sent to the backend. This is made to ensure
 * there is no way to backtrack to user's history using data sent to
 * the backend.
 *
 * Replace all the keys of `trackerData` (which are 16-chars prefixes of
 * hash of the source domain) by unique random strings of size 16 (which is
 * expected by backend). We don't have to make them unique among all data,
 * it is enough to ensure unicity on a per-tracker basis.
 *
 * @param {Object} trackerData - associate source domains to key/value pairs.
**/
function anonymizeTrackerTokens(trackerData) {
  let index = 1
  // Anonymize the given tracker data
  const anonymizedTrackerData = {};

  for (let originalKey in trackerData) {
    const newRandomKey = leftpad(index.toString().substr(0, 16), '0', 16);
    index += 1;
    anonymizedTrackerData[newRandomKey] = trackerData[originalKey];
  }

  return anonymizedTrackerData;
}


class DocumentBatch {

  constructor(db, docs) {
    this.db = db;
    this.docs = docs;
  }

  getDocs() {
    return this.docs.rows.map(row => row.doc);
  }

  getRows() {
    return this.docs.rows;
  }

  delete() {
    const deleteDocs = this.docs.rows.map((row) => ({
      _id: row.doc._id,
      _rev: row.doc._rev,
      _deleted: true,
    }));
    return this.db.bulkDocs(deleteDocs);
  }
}


class LastSentDb {

  constructor(name, timestampFn) {
    this.lastSentLog = new Database(name, {auto_compaction: true});
    this.timestampFn = timestampFn;
    // create index on last sent field
    var ddoc = {
      _id: '_design/lastSent',
      views: {
        ascending: {
          map: function (doc) { emit(doc.lastSent); }.toString()
        }
      }
    };
    this.lastSentLog.put(ddoc);
  }

  /**
   * Mark the last sent time for a key. If it isn't already in the database
   * we add it using the timestampFn to set the lastSent time, otherwise this
   * does nothing
   * @param  {String} key
   * @return {Promise}        Resolves on success, rejects on failure
   */
  touchKey(key, name) {
    return this.lastSentLog.get(key).catch((err) => {
      if (err.name === 'not_found') {
        this.lastSentLog.put({
          _id: key,
          lastSent: this.timestampFn(),
          name: name,
        });
      } else {
        throw err;
      }
    });
  }

  /**
   * Return the number of entries in the table
   * @return {[type]} [description]
   */
  count() {
    return this.lastSentLog.info().then((stats) => {
      return stats.doc_count;
    });
  }

  /**
   * Take items from the db, oldest first.
   * @param  {Object} options Options passed to the pouch query (e.g. limit)
   * @return {Promise}        Resolves to a {DocumentBatch} of the fetched documents
   */
  take(options) {
    options.include_docs = true
    return this.lastSentLog.query('lastSent/ascending', options).then((docs) => {
      return new DocumentBatch(this.lastSentLog, docs)
    });
  }
}


class TokenDb {

  constructor() {
    this.db = new Database('cliqz-attrack-tokens', {auto_compaction: true});
  }

  /**
   * Get an object for the given token tuple from the database
   * @param  {String} options.domain
   * @param  {String} options.firstParty
   * @param  {String} options.key
   * @param  {String} options.value
   * @param  {Integer} options.keyLen
   * @param  {Integer} options.valueLen
   * @return {Object}
   */
  getToken({domain, firstParty, k, v, k_len, v_len}) {
    const id = domain + firstParty + k + v;
    // get the document, or create a new one if it doesn't exist
    return this.db.get(id).catch((err) => {
      if (err.name === 'not_found') {
        return {
          _id: id,
          domain,
          fp: firstParty,
          k,
          v,
          k_len,
          v_len,
          c: 0,
        }
      } else {
        throw err;
      }
    });
  }

  /**
   * Insert the tokens from keyTokens into the token db.
   * @param  {String} domain
   * @param  {String} firstParty
   * @param  {Array} keyTokens   Array of objects with k, v, k_len and v_len properties
   * @return {Promise}           Resolves once insert is completed
   */
  insertTokens(domain, firstParty, keyTokens) {
    // get docs and increment counts
    const upserts = keyTokens.map((kv) => {
      return this.getToken({
        domain,
        firstParty,
        k: kv.k,
        v: kv.v,
        k_len: kv.k_len,
        v_len: kv.v_len
      }).then((doc) => {
        doc.c += 1;
        return doc;
      });
    });

    // the returned documents can will be inserts for new
    // records, or updates for existing records
    return Promise.all(upserts).then((docs) => {
      return this.db.bulkDocs(docs);
    });
  }

  /**
   * Get all the tokens in the db for the specified domain
   * @param  {String} domain
   * @return {Promise}        Resolves with a DocumentBatch with the token documents
   */
  getTokensForDomain(domain) {
    // get allDocs with domain as the id prefix
    return this.db.allDocs({
      include_docs: true,
      startkey: domain,
      endkey: domain + '\uffff',
    }).then((docs) => {
      return new DocumentBatch(this.db, docs);
    });
  }

  deleteAll(documentBatches) {
    return Promise.all(documentBatches.map(d => d.delete()));
  }
}


/**
 * Converts an array of token rows in db format to a nested dictionary
 * @param  {Array} tokens from DB
 * @return {Object}        Nested object for telemetry.
 */
function convertTokenRowsToPayload(tokens) {
  const payload = {};
  tokens.forEach((doc) => {
    if (!payload[doc.domain]) {
      payload[doc.domain] = {}
    }
    if (!payload[doc.domain][doc.fp]) {
      payload[doc.domain][doc.fp] = {};
    }
    if (!payload[doc.domain][doc.fp][doc.k]) {
      payload[doc.domain][doc.fp][doc.k] = {}
    }
    payload[doc.domain][doc.fp][doc.k][doc.v] = {
      c: doc.c,
      k_len: doc.k_len,
      v_len: doc.v_len,
    }
  });
  return payload;
}


export default class {

  constructor(telemetry) {
    this.telemetry = telemetry;
    this.lastSentLog = new LastSentDb('cliqz-attrack-tokens-lastsent', datetime.getTime);
    this.tokenDb = new TokenDb();
  }

  init() {
    this._pmsend = pacemaker.register(this.sendTokens.bind(this), 5 * 60 * 1000);
  }

  unload() {
    pacemaker.deregister(this._pmsend);
  }

  extractKeyTokens(state) {
    // ignore private requests
    if(state.requestContext.isChannelPrivate()) return true;

    const keyTokens = state.urlParts.getKeyValuesMD5();
    if (keyTokens.length > 0) {
      const domain = state.urlParts
      const firstParty = md5(state.sourceUrlParts.hostname).substr(0, 16);
      this._saveKeyTokens(domain, keyTokens, firstParty);
    }
    return true;
  }

  _saveKeyTokens(domainParts, keyTokens, firstParty) {
    const domain = md5(domainParts.hostname).substr(0, 16);
    // touch this domain with the current hour if it is new
    return this.lastSentLog.touchKey(domain, domainParts.hostname).then(() => {
      // insert all the tokens into the token db
      return this.tokenDb.insertTokens(domain, firstParty, keyTokens);
    });
  }

  sendTokens() {
    //send tokens every 5 minutes
    const hour = datetime.getTime();
    const hourFormat = "YYYYMMDDHH"
    const prevHour = moment(hour, hourFormat).subtract(1, 'hours').format(hourFormat);

    console.log('xxx', 'sendTokens');
    return this.lastSentLog.count().then((count) => {
      // calculate number of elements to send
      const limit = Math.ceil(count / 12);

      // get domains with last update before the current hour
      return this.lastSentLog.take({
        endkey: prevHour,
        limit,
      }).then((lastSentResults) => {
        console.log('sending', lastSentResults.getRows().length, 'of', lastSentResults.docs.total_rows, 'queued domains');
        // gather all the tokens which we want to send
        const gatherTokensToSend = lastSentResults.getRows().map((domain) => {
          return this.tokenDb.getTokensForDomain(domain.id);
        });

        return Promise.all(gatherTokensToSend).then((tokenBatches) => {
          // convert row batches into payload objects
          const payloadParts = tokenBatches.map((batch) => {
            return convertTokenRowsToPayload(batch.getDocs());
          });
          // merge all the parts together - there should be no key conflicts
          const payloadData = Object.assign({}, ...payloadParts);
          console.log('xxx', 'payload', payloadData);

          // delete all sent data from the db
          return this.tokenDb.deleteAll(tokenBatches).then(() => lastSentResults.delete()).then(() => {
            // once we've deleted everything, its safe to send (no chance of double send)
            this._sendTelemetry(payloadData);
          })
        });
      });
    });
  }

  _sendTelemetry(data) {
    if (Object.keys(data).length > 0) {
      splitTelemetryData(data, 20000).map((d) => {
        const msg = {
          'type': this.telemetry.msgType,
          'action': 'attrack.tokens',
          'payload': d
        };
        this.telemetry({
          message: msg,
          compress: true,
        });
      });
    }
  }
}
