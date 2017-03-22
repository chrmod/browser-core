import Database from '../database';
import DocumentBatch from './document-batch';

export default class {
  
  constructor(name) {
    this.db = new Database(name, { auto_compaction: true });
    // create index on sort field
    const ddoc = {
      _id: '_design/sorted',
      views: {
        ascending: {
          map: function (doc) { emit(doc.sort); }.toString()
        }
      }
    };
    this.db.put(ddoc);
  }

  /**
   * Add a value to the queue with the specified sort value.
   * If key already exists in the queue, this is a noop. Setting `overwrite` to 
   * true overrides this behaviour.
   * @param {String} key 
   * @param {Any} sortValue 
   * @param {Bool} overwrite (optional) default false
   */
  offer(key, sortValue, overwrite = false) {
    return this.db.get(key).catch((err) => {
      if (err.name === 'not_found') {
        return {
          _id: key,
          sort: sortValue,
        };
      } else {
        throw err;
      }
    })
    .then((doc) => {
      if (overwrite || !doc._rev) {
        return this.db.put(doc);
      }
      return Promise.resolve(doc);
    });
  }

  length() {
    return this.db.info().then((stats) => {
      return stats.doc_count;
    });
  }

  /**
   * Fetch entries from the queue (in order)
   * @param {Object} opts Options to query:
   *    - `limit` limit maximum number of results
   *    - `descending` to reverse ordering
   *    - `startKey` and `endKey` to filter between sort values
   * @returns {Promise<DocumentBatch>} batch of documents containing `key` and `sort` objects
   */
  peek(opts) {
    const options = Object.assign({
      include_docs: true,
    }, opts);
    return this.db.query('sorted/ascending', options).then((docs) => {
      return new DocumentBatch(this.db, docs)
    });
  }

  /**
   * Fetch and remove n entries from the queue
   * @param {Objects} opts Query options (see peek)
   * @returns {Promise<DocumentBatch>}
   */
  drain(opts) {
    return this.peek(opts).then((batch) => {
      return batch.delete().then(() => Promise.resolve(batch));
    });
  }

}
