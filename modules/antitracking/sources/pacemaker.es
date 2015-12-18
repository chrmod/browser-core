
const default_tpace = 10 * 1000;

class Pacemaker {

  constructor(tpace, twait) {
    this.tpace = tpace || default_tpace;
    this.twait = (new Date()).getTime() + (twait || 0);
    this._id = CliqzUtils.setInterval(this._tick.bind(this), this.tpace, null);
    this._tasks = new Set();
  }

  destroy() {
    CliqzUtils.clearTimeout(this._id);
  }

  _tick() {
    var now = (new Date()).getTime();
    // initial waiting period
    if (this.twait > now) {
      CliqzUtils.log("tick wait", "pacemaker");
      return;
    }

    // run registered tasks
    this._tasks.forEach(function(task) {
      if (now > task.last + task.freq) {
        CliqzUtils.setTimeout(function() {
          let task_name = task.fn.name || "<anon>";
          try {
            CliqzUtils.log("run task: "+ task_name, "pacemaker");
            task.fn(now);
            task.last = now;
          } catch(e) {
            CliqzUtils.log("Error executing task "+ task_name +": "+ e, "pacemaker");
          }
        }, 0);
      }
    });
  }

  /** Register a function to be run periodically by the pacemaker.
        @param fn function to call
        @param frequency minimum interval between calls, in ms.
        @returns task object, which can be used with deregister to stop this task.
   */
  register(fn, frequency) {
    var freq = frequency || 0;
    var task = {
      fn: fn,
      freq: freq,
      last: 0
    };
    this._tasks.add(task);
    return task;
  }

  deregister(task) {
    this._tasks.delete(task);
  }
}

// export singleton pacemaker
var pm = new Pacemaker(30000, 10000);
export default pm;
