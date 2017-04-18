import md5 from '../md5';
import * as datetime from '../time';
import * as persist from '../persistent-state';
import { splitTelemetryData } from '../utils';
import pacemaker from '../pacemaker';
import Database from '../../core/database';
import DocumentBatch from '../../core/persistence/document-batch';
import OrderedQueue from '../../core/persistence/ordered-queue';
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

class TokenDb {

  constructor() {
    this.db = new Database('cliqz-attrack-tokens', {auto_compaction: true});
  }

  /**
   * Get an object for the given token tuple from the database
   * @param  {String} options.prefix Prefix used in database ID - used for sending constraints
   * @param  {String} options.domain
   * @param  {String} options.firstParty
   * @param  {String} options.key
   * @param  {String} options.value
   * @param  {Integer} options.keyLen
   * @param  {Integer} options.valueLen
   * @return {Object}
   */
  getToken({prefix, domain, firstParty, k, v, k_len, v_len}) {
    const id = `${prefix}${domain}${firstParty}${k}${v}`;
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
   * @param  {String} prefix
   * @param  {String} domain
   * @param  {String} firstParty
   * @param  {Array} keyTokens   Array of objects with k, v, k_len and v_len properties
   * @return {Promise}           Resolves once insert is completed
   */
  insertTokens(prefix, domain, firstParty, keyTokens) {
    // get docs and increment counts
    const upserts = keyTokens.map((kv) => {
      return this.getToken({
        prefix,
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

  /**
   * Return the number of entries in the table
   * @return {[type]} [description]
   */
  count() {
    return this.db.info().then((stats) => {
      return stats.doc_count;
    });
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
    this.lastSentLog = new OrderedQueue('cliqz-attrack-tokens-lastsent');
    this.tokenDb = new TokenDb();
    this._staged = {};
  }

  init() {
    this._pmsend = pacemaker.register(this.sendTokens.bind(this), 5 * 60 * 1000);
    this._pmcommit = pacemaker.register(this.commit.bind(this), 1 * 60 * 1000);
  }

  unload() {
    pacemaker.deregister(this._pmsend);
    pacemaker.deregister(this._pmcommit);
  }

  _makeHash(s) {
    return md5(s).substr(0, 16);
  }

  extractKeyTokens(state) {
    // ignore private requests
    if(state.requestContext.isChannelPrivate()) return true;

    const keyTokens = state.urlParts.getKeyValuesMD5();
    if (keyTokens.length > 0) {
      const domain = this._makeHash(state.urlParts.hostname);
      const firstParty = this._makeHash(state.sourceUrlParts.hostname);
      const generalDomain = state.urlParts.generalDomainHash;
      this._saveKeyTokens(generalDomain, domain, keyTokens, firstParty);
    }
    return true;
  }

  _saveKeyTokens(generalDomain, domain, keyTokens, firstParty) {
    if (!this._staged[generalDomain]) {
      this._staged[generalDomain] = [];
    }
    // just push the data into an array at this point. This data will be committed later.
    this._staged[generalDomain].push({
      domain,
      firstParty,
      keyTokens,
    });
  }

  commit() {
    const ts = datetime.getTime();
    const queue = this._staged;
    this._staged = {};
    return Promise.all(Object.keys(queue).map((generalDomain) => {
      // touch this domain with the current hour if it is new
      return this.lastSentLog.offer(generalDomain, ts).then(() => {
        const batches = queue[generalDomain];
        // insert all the tokens into the token db
        // chain all the batches serially in a Promise
        return batches.reduce((acc, item) => {
          return acc.then(() => this.tokenDb.insertTokens(generalDomain, item.domain, item.firstParty, item.keyTokens))
        }, Promise.resolve());
      });
    }));
  }

  sendTokens() {
    //send tokens every 5 minutes
    const hour = datetime.getTime();
    const hourFormat = "YYYYMMDDHH"
    const prevHour = moment(hour, hourFormat).subtract(1, 'hours').format(hourFormat);

    return Promise.all([this.lastSentLog.length(), this.tokenDb.count()]).then((counts) => {
      console.log('have', counts[1], 'tokens for', counts[0], 'domains in the db');
      // calculate number of elements to send
      const domainCount = counts[0];
      const limit = Math.floor(domainCount / 12) || 1;

      // get domains with last update before the current hour
      return this.lastSentLog.peek({
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
