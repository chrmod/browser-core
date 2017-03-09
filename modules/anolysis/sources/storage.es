/* eslint no-underscore-dangle: off */
/* global emit */


import log from 'anolysis/logging';
import getSynchronizedDate, { DATE_FORMAT } from 'anolysis/synchronized-date';


export default class {
  constructor(database) {
    this.database = database;

    const designDoc = {
      _id: '_design/index',
      views: {
        by_ts: {
          map: function map(doc) {
            emit(doc.ts);
          }.toString(),
        },
      },
    };

    // TODO: don't try to insert if it already exists
    this.database.put(designDoc)
      .then(() => {
        this.database.query('index/by_ts', {
          limit: 0,
        });
      });
  }

  getDocType(doc) {
    // Infer type from `doc`
    if (doc.demographics) {
      return 'demographics';
    } else if (doc.behavior && doc.behavior.type) {
      return doc.behavior.type;
    } else if (doc.type) {
      return doc.type;
    }

    return 'behavior';
  }

  info() {
    return this.database.info();
  }

  remove(doc) {
    this.database.remove(doc);
  }

  put(doc) {
    const type = this.getDocType(doc);
    const timestamp = getSynchronizedDate().format(DATE_FORMAT);
    const decoratedDoc = Object.assign({
      ts: doc.ts || timestamp,
      _id: doc._id || `${doc.ts || Date.now()}/${type}`,
    }, doc);

    return this.database.put(decoratedDoc)
      .then(() => decoratedDoc)
      .catch((ex) => { log(`put exception ${ex} ${JSON.stringify(decoratedDoc)}`); });
  }

  getN(n) {
    return this.database.allDocs({
      include_docs: true,
      limit: n,
    })
    .then(result => result.rows.map(row => row.doc))
    .then(result => result.filter(doc => doc._id !== '_design/index'));
  }

  getLastN(n) {
    return this.database.allDocs({ include_docs: true })
      .then(result => result.rows.map(row => row.doc))
      .then(result => result.filter(doc => doc._id !== '_design/index'))
      .then((result) => {
        // Sort result by ts (descending)
        result.sort((row1, row2) => {
          if (row1.ts > row2.ts) return -1;
          if (row1.ts < row2.ts) return 1;
          return 0;
        });

        // Latest result comes first
        return result.slice(0, n);
      });
  }

  getByTimespan({ from, to } = { }) {
    log(`getByTimespan ${from} -> ${to}`);
    return this.database.query('index/by_ts', {
      startkey: from,
      endkey: to,
      include_docs: true,
    }).then((result) => {
      const documents = result.rows.map(row => row.doc);
      log(`getByTimespan from ${from} to ${to} found ${documents.length} documents`);
      return documents;
    });
  }

  getTypesByTimespan(timespan) {
    /* eslint no-param-reassign: off */
    return this.getByTimespan(timespan)
      // group by type
      .then(documents => documents.reduce((pre, cur) => {
        const type = this.getDocType(cur);
        pre[type] = pre[type] || [];
        pre[type].push(cur);
        return pre;
      }, Object.create(null)));
  }

  deleteByTimespan(timespan) {
    return this.getByTimespan(timespan)
      .then((documents) => {
        log(`remove ${documents.length} with timespan ${JSON.stringify(timespan)}`);
        return Promise.all(documents.map(doc => this.database.remove(doc)));
      });
  }
}
