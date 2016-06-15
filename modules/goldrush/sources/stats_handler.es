import { utils } from 'core/cliqz';

////////////////////////////////////////////////////////////////////////////////
// Consts

const STATS_SENT_PERIODISITY_MS = 1000 * (60 * 60 * 24);

// storage address
const STATS_LOCAL_STORAGE_URL = 'chrome://cliqz/content/goldrush/stats_db.json';


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

    // we will use the CliqzStorage here
    var localStorage = CLIQZEnvironment.getLocalStorage(STATS_LOCAL_STORAGE_URL);
    var cache = localStorage.getItem('stats_data');
    if (!cache) {
      // we need to write this then
      log('no db found, creating new one');
      this.generateNewDataStructure();
      localStorage.setItem('stats_data', JSON.stringify(this.currentData));
    } else {
      log('db found, loading it: ' + cache);
      // we have data, load it
      this.currentData = JSON.parse(cache);
      if (this.shouldWeNeedToSendCurrenData()) {
        this.sendOverTelemetry();
        this.generateNewDataStructure();
      }
    }

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
    var localStorage = CLIQZEnvironment.getLocalStorage(STATS_LOCAL_STORAGE_URL);
    localStorage.setItem('stats_data', JSON.stringify(this.currentData));
  }


  //////////////////////////////////////////////////////////////////////////////
  //                            "Private" methods
  //////////////////////////////////////////////////////////////////////////////

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
  // @brief when a coupon rejected by the main button
  //
  couponRejected(clusterID) {
    log('couponRejected');
    generateOrAddField(this.currentData['data'], clusterID, 'coupons_rejected', 1);
  }

  //
  // @brief when the offer is closed by some other reason
  //
  advertiseClosed(clusterID) {
    log('advertiseClosed');
    generateOrAddField(this.currentData['data'], clusterID, 'offers_closed', 1);
  }

  //
  // @brief when the ad is closed by the user on the X button
  //
  advertiseClosedByUser(clusterID) {
    log('advertiseClosedByUser');
    generateOrAddField(this.currentData['data'], clusterID, 'offers_closed_by_user', 1);
  }

  //
  // @brief an ad has being desplayed
  //
  advertiseDisplayed(offerInfo) {
    log('advertiseDisplayed');
    const clusterID = offerInfo['appear_on_cid'];
    generateOrAddField(this.currentData['data'], clusterID, 'offers_displayed', 1);
  }

  //
  // @brief when the offer is created by the first time
  //
  offerCreated(offerInfo) {
    log('offerCreated');
    const clusterID = offerInfo['appear_on_cid'];
    generateOrAddField(this.currentData['data'], clusterID, 'offer_created', 1);
  }

  //
  // @brief user bought or is in the checkout page
  //
  userProbablyBought(domainID, clusterID) {
    log('userProbablyBought');
    generateOrAddField(this.currentData['data'], clusterID, 'checkouts', 1);
  }

  //
  // @brief system intention detected
  //
  systemIntentionDetected(domainID, clusterID) {
    log('systemIntentionDetected');
    generateOrAddField(this.currentData['data'], clusterID, 'system_intents', 1);
  }

  //
  // @brief user visited the cluster
  //
  userVisitedCluster(clusterID) {
    log('userVisitedCluster');
    generateOrAddField(this.currentData['data'], clusterID, 'visits', 1);
  }

}



