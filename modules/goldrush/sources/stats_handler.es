import { utils } from 'core/cliqz';
import ResourceLoader from 'core/resource-loader';

////////////////////////////////////////////////////////////////////////////////
// Consts

const STATS_DB_FILENAME = 'stats_db.json';
const STATS_SENT_PERIODISITY_MS = 1000 * (60 * 60 * 24);



////////////////////////////////////////////////////////////////////////////////
function log(s){
  utils.log(s, 'GOLDRUSH - StatsHandler');
}

function generateOrAddField(d, f1, f2, val) {
  if (!d[f1]) {
    d[f1] = {};
  }
  if (!d[f1][f2]) {
    d[f1][f2] = val;
  } else {
    d[f1][f2] += val;
  }
}

////////////////////////////////////////////////////////////////////////////////
export class StatsHandler {

  constructor(name) {
    // TODO: construct the data properly here
    // DATA LAYOUT:
    //
    this.currentData = {
      'data' : {},
      'last_ts_sent' : Date.now()
    };
    var self = this;
    // load the current data if we have one
    this.readFromDB().then(function(json) {
      if (!json) {
        log('error reading the db, maybe doesnt exists');
        self.generateNewDataStructure();
        // save the new db.
        self.saveToDB();
        return;
      }
      // else we assign this one to the current data
      self.currentData = json;
      if (self.shouldWeNeedToSendCurrenData()) {
        self.sendOverTelemetry();
        self.generateNewDataStructure();
      }
    });

    // TODO: here we can re-set properly the timer but we will just set it
    // to the time specified above
    this.interval = CliqzUtils.setInterval(function () {
      // we will check if we need to send the data and we will send it and
      // reset all the counters if needed
      if (this.shouldWeNeedToSendCurrenData()) {
        if (this.sendOverTelemetry()) {
          // reset only if we are able to send it over telemetry
          this.generateNewDataStructure();
        }
      }
    }.bind(this), STATS_SENT_PERIODISITY_MS);
  }

  destroy() {
    // TODO: check if the best option is calling this here
    // remove the interval update method
    CliqzUtils.clearInterval(this.interval);

    // check if we need to send this data or not
    if (this.shouldWeNeedToSendCurrenData()) {
      if (this.sendOverTelemetry()) {
        // reset only if we are able to send it over telemetry
        this.generateNewDataStructure();
      }
    }
    // at any case we store the current data
    this.saveToDB();
  }


  //////////////////////////////////////////////////////////////////////////////
  //                            "Private" methods
  //////////////////////////////////////////////////////////////////////////////

  //
  // @brief read from the database the current values.
  //
  readFromDB() {
    return new Promise(function (resolve, reject) {
      // check if we have the data base or not
      let rscLoader = new ResourceLoader(
        [ 'goldrush', STATS_DB_FILENAME ],
        {}
      );
      log('reading database from file')
      rscLoader.load().then(function(json) {
        // assigning the json to the object
        log('stats handler database loaded properly: ' + JSON.stringify(json));
        resolve(json);
      }).catch(function(reason) {
        log('error loading the data from the file, maybe doesnt exists yet: ' + reason);
        reject(null);
      });
    });
  }

  //
  // @brief save the current data into the db
  //
  saveToDB() {
    if (!this.currentData) {
      // nothing to save
      return;
    }

    log('saving current data');
    let rscLoader = new ResourceLoader(
      [ 'goldrush', STATS_DB_FILENAME ],
      {}
    );

    return rscLoader.persist(JSON.stringify(this.currentData, null, 4));
  }

  //
  // @brief this method will sent the current data over telemtry.
  // @return true on success | false otherwise
  //
  sendOverTelemetry() {
    // TODO:
    log('sending over telemetry');

    if (!this.currentData) {
      return;
    }

    var signal = {
      type: 'offers',
      offers_data: this.currentData
    };

    // send it over telemetry
    log(signal); // TODO: remove this log

    // TODO: uncomment this
    // CliqzUtils.telemetry(signal);
  }

  //
  // @brief this method will clear and reset all the field of the current
  //        data to start filling it again
  //
  generateNewDataStructure() {
    log('generating a new empty structure');
    this.currentData = {
      'data' : {},
      'last_ts_sent' : Date.now()
    };
  }

  //
  // @brief this method will check if we need to send the current data over
  //        the telemetry or not
  //
  shouldWeNeedToSendCurrenData() {
    // TODO: this will check the timestamp of the last telemetry data sent.
    const lastTimeSent = this.currentData['last_ts_sent'];
    const diffTime = Date.now() - lastTimeSent;
    return (diffTime >= STATS_SENT_PERIODISITY_MS);
  }



  //////////////////////////////////////////////////////////////////////////////
  //                            API
  //////////////////////////////////////////////////////////////////////////////


  //
  // @brief collect that a new coupon has being used.
  //
  couponUsed(offerInfo) {
    // TODO: we can get the domain id and cluster id from:
    // offerInfo['appear_on_did']
    // offerInfo['appear_on_cid']
    log('couponUsed');
    const clusterID = offerInfo['appear_on_cid'];
    generateOrAddField(this.currentData['data'], clusterID, 'coupons_used', 1);
  }

  //
  // @brief coupon being clicked
  //
  couponClicked(clusterID) {
    log('couponClicked');
    generateOrAddField(this.currentData['data'], clusterID, 'coupons_opened', 1);
  }

  //
  // @brief when a coupon is clicked to save
  //
  couponSaved(offerInfo) {
    // TODO: we can get the domain id and cluster id from:
    // offerInfo['appear_on_did']
    // offerInfo['appear_on_cid']
    log('couponSaved');
    const clusterID = offerInfo['appear_on_cid'];
  }

  //
  // @brief when a coupon rejected by the main button
  //
  couponRejected(offerInfo) {
    // TODO: we can get the domain id and cluster id from:
    // offerInfo['appear_on_did']
    // offerInfo['appear_on_cid']
    log('couponRejected');
    const clusterID = offerInfo['appear_on_cid'];
    generateOrAddField(this.currentData['data'], clusterID, 'coupons_rejected', 1);
  }

  //
  // @brief when the ad is closed by the user on the X button
  //
  advertiseClosedByUser(clusterID) {
    log('advertiseClosedByUser');
    generateOrAddField(this.currentData['data'], clusterID, 'offers_closed_by_user', 1);
  }

  //
  // @brief when the offer is closed by some other reason
  //
  advertiseClosed(clusterID) {
    log('advertiseClosed');
    generateOrAddField(this.currentData['data'], clusterID, 'offers_closed', 1);
  }

  //
  // @brief an ad has being desplayed
  //
  advertiseDisplayed(offerInfo) {
    // TODO: we can get the domain id and cluster id from:
    // offerInfo['appear_on_did']
    // offerInfo['appear_on_cid']
    log('advertiseDisplayed');
    const clusterID = offerInfo['appear_on_cid'];
    generateOrAddField(this.currentData['data'], clusterID, 'offers_displayed', 1);
  }

  //
  // @brief user bought or is in the checkout page
  //
  userProbablyBought(domainID, clusterID) {
    // TODO
    log('userProbablyBought');
    generateOrAddField(this.currentData['data'], clusterID, 'checkouts', 1);
  }

  //
  // @brief system intention detected
  //
  systemIntentionDetected(domainID, clusterID) {
    // TODO
    log('systemIntentionDetected');
    generateOrAddField(this.currentData['data'], clusterID, 'system_intents', 1);
  }

}



