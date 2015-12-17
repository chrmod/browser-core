import pacemaker from "antitracking/pacemaker";

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

const LOG_KEY = "attrack-persist";

// connect to sqlite database and create attrack table
var dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbattrack"]));
var attrack_table = "create table if not exists attrack(\
    id VARCHAR(24) PRIMARY KEY NOT NULL,\
    data VARCHAR(1000000) \
)";
(dbConn.executeSimpleSQLAsync || dbConn.executeSimpleSQL)(attrack_table);

/** Load data from the attrack sqlite table.
    From CliqzAttrack.loadRecord
 */
function loadRecord(id, callback) {
  var stmt = dbConn.createAsyncStatement("SELECT id, data FROM attrack WHERE id = :id;");
      stmt.params.id = id;

  var fres = null;
  var res = [];
  stmt.executeAsync({
    handleResult: function(aResultSet) {
      for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
        if (row.getResultByName("id")==id) {
            res.push(row.getResultByName("data"));
        }
        else {
          CliqzUtils.log("There are more than one record", LOG_KEY);
          callback(null);
        }
        break;
      }
    },
    handleError: function(aError) {
        CliqzUtils.log("SQL error: " + aError.message, LOG_KEY);
        callback(null);
    },
    handleCompletion: function(aReason) {
        if (res.length == 1) callback(res[0]);
        else callback(null);
    }
  });
};

/** Save data to the attrack sqlite table.
    From CliqzAttrack.saveRecord
 */
function saveRecord(id, data) {
  CliqzUtils.log(id, "xxx");
  CliqzUtils.log(data, "xxx");
  var st = dbConn.createStatement("INSERT OR REPLACE INTO attrack (id,data) VALUES (:id, :data)");
  st.params.id = id;
  st.params.data = data;
  var t_start = (new Date()).getTime();

  st.executeAsync({
    handleError: function(aError) {
     CliqzUtils.log("SQL error: " + aError.message, LOG_KEY);
    },
    handleCompletion: function(aReason) {
      var t_end = (new Date()).getTime();
      CliqzUtils.log("Save "+ id +" in "+ (t_end - t_start) +"ms, data length = "+ data.length, LOG_KEY);
    }
  });
};

class PersistanceHandler {
  constructor(name, target, dirty) {
    this.name = name;
    this.target = target;
    this.dirty = dirty || false;
    // write dirty pages every minute
    pacemaker.register(this.persistState.bind(this), 60000);

    // propegate proxy down object leaves
    for (let k in this.target) {
      this.target[k] = this.proxyBranch(this.target[k]);
    }

    // trap for set operations
    this.set = function(target, property, value, receiver) {
      CliqzUtils.log("set "+ this.name, LOG_KEY);
      // propegate proxy down object tree
      target[property] = this.proxyBranch(value);
      this.dirty = true;
      return true;
    };
    // trap for delete operations
    this.deleteProperty = function(target, property) {
      CliqzUtils.log("delete "+ this.name, LOG_KEY);
      delete target[property];
      this.dirty = true;
      return true;
    };
  }

  persistState() {
    if (this.dirty) {
      saveRecord(this.name, JSON.stringify(this.target));
      this.dirty = false;
    }
  }

  proxyBranch(obj) {
    if (typeof obj === 'object') {
      for (let k in obj) {
        obj[k] = this.proxyBranch(obj[k]);
      }
      return new Proxy(obj, this);
    } else {
      return obj;
    }
  }
};

export default function(name, setter) {
  loadRecord(name, function(value) {
    var obj = {},
        dirty = false;
    try {
      obj = JSON.parse(value || "{}");
    } catch(e) {
      obj = {};
      dirty = true;
    }
    setter(new Proxy(obj, new PersistanceHandler(name, obj, dirty)));
  });
}
