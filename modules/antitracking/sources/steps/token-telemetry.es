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


export default class {

  constructor(telemetry) {
    this.telemetry = telemetry;
    this.lastSentLog = new Database('cliqz-attrack-tokens-lastsent', {auto_compaction: true});
    var ddoc = {
      _id: '_design/lastSent',
      views: {
        ascending: {
          map: function (doc) { emit(doc.lastSent); }.toString()
        }
      }
    };
    this.lastSentLog.put(ddoc);
    this.tokenDb = new Database('cliqz-attrack-tokens', {auto_compaction: true});
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
      const domain = md5(state.urlParts.hostname).substr(0, 16);
      const firstParty = md5(state.sourceUrlParts.hostname).substr(0, 16);
      this._saveKeyTokens(domain, keyTokens, firstParty);
    }
    return true;
  }

  _saveKeyTokens(domain, keyTokens, firstParty) {
    // look for domain document and insert if it doesn't exist
    this.lastSentLog.get(domain).catch((err) => {
      if (err.name === 'not_found') {
        this.lastSentLog.put({
          _id: domain,
          lastSent: datetime.getTime(),
        });
      } else {
        throw err;
      }
    });
    // get token/firstparty tuple if it exists
    const tuplePrefix = domain + firstParty;
    const upserts = keyTokens.map((kv) => {
      const tok = kv.v;
      const k = kv.k;
      const id = tuplePrefix + k + tok;

      return this.tokenDb.get(id).catch(err => {
        if (err.name === 'not_found') {
          return {
            _id: id,
            domain: domain,
            fp: firstParty,
            k: k,
            v: tok,
            k_len: kv.k_len,
            v_len: kv.v_len,
            c: 0,
          }
        } else {
          throw err;
        }
      }).then((doc) => {
        doc.c += 1;
        return doc;
      });
    });
    // when we have docs to insert, send a bulk put
    Promise.all(upserts).then((docs) => {
      this.tokenDb.bulkDocs(docs);
    });
  }

  sendTokens() {
    //send tokens every 5 minutes
    const hour = datetime.getTime();
    const hourFormat = "YYYYMMDDHH"
    const prevHour = moment(hour, hourFormat).subtract(1, 'hours').format(hourFormat);

    this.lastSentLog.info().then((stats) => {
      // calculate number of elements to send
      const limit = Math.ceil(stats.doc_count / 12);

      // get domains with last update before the current hour
      this.lastSentLog.query('lastSent/ascending', {
        endkey: prevHour,
        limit,
        include_docs: true,
      }).then((lastSentResults) => {
        console.log('sending', lastSentResults.rows.length, 'of', lastSentResults.total_rows, 'queued domains');
        const gatherData = lastSentResults.rows.map((domain) => {
          const key = domain.id;
          // prefix search for the domain hash
          return this.tokenDb.allDocs({
            include_docs: true,
            startkey: key,
            endkey: key + '\uffff',
          }).then((tokenResult) => {
            // collect docs into an object if expected sending format
            const docs = tokenResult.rows.map((r) => r.doc);
            // console.log('docs', key, docs);
            const domainData = {}
            docs.forEach((doc) => {
              if (!domainData[doc.fp]) {
                domainData[doc.fp] = {};
              }
              if (!domainData[doc.fp][doc.k]) {
                domainData[doc.fp][doc.k] = {}
              }
              domainData[doc.fp][doc.k][doc.v] = {
                c: doc.c,
                k_len: doc.k_len,
                v_len: doc.v_len,
              }
            });
            // console.log('docs', key, domainData);
            return { domain: key, docs, data: domainData };
          });
        });

        Promise.all(gatherData).then((dataParts) => {
          const data = {}
          const docsForDeletion = [].concat.apply([], dataParts.map((domainTokens) => {
            data[domainTokens.domain] = domainTokens.data;
            return domainTokens.docs;
          }));

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

            // delete token data
            this.tokenDb.bulkDocs(docsForDeletion.map((doc) => {
              doc._deleted = true;
              return doc;
            })).then(() => {
              // delete last sent
              return this.lastSentLog.bulkDocs(lastSentResults.rows.map((res) => {
                const doc = res.doc;
                doc._deleted = true;
                return doc;
              }));
            });

          }
        });
      });
    });

  }
}
