
export default class DocumentBatch {

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
    const deleteDocs = this.docs.rows.map(row => ({
      _id: row.doc._id,
      _rev: row.doc._rev,
      _deleted: true,
    }));
    return this.db.bulkDocs(deleteDocs);
  }
}
