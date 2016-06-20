import { utils } from 'core/cliqz';

////////////////////////////////////////////////////////////////////////////////
// Consts

// TODO: define this constant
const STATS_SENT_PERIODISITY_MS = 1000 * 3000; /*1000 * (60 * 60 * 24);*/

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
        log('after loading it pass more than N seconds so we will send it now');
        if (this.sendOverTelemetry()) {
          this.generateNewDataStructure();
          // reset the current data in the database to avoid inconsistences
          localStorage.setItem('stats_data', JSON.stringify(this.currentData));
        }
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
          localStorage.setItem('stats_data', JSON.stringify(this.currentData));
        }
      }
    }.bind(this), STATS_SENT_PERIODISITY_MS);
  }

  destroy() {
    // TODO: check if the best option is calling this here
    // remove the interval update method
    CliqzUtils.clearInterval(this.interval);

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

    if (!this.currentData || !this.currentData['data']) {
      return false;
    }

    var signal = {
      type: 'offers',
      data: this.currentData['data']
    };

    // send it over telemetry
    log('Signal to send: ' + JSON.stringify(signal)); // TODO: remove this log

    // TODO: uncomment this
    //CliqzUtils.telemetry(signal);

    return true;
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
    const lastTimeSent = Number(this.currentData['last_ts_sent']);
    const diffTime = Date.now() - lastTimeSent;
    log('shouldWeNeedToSendCurrenData: lastTimeSent: ' + lastTimeSent +
        ' - diffTime: ' + diffTime +
        ' - STATS_SENT_PERIODISITY_MS: ' + STATS_SENT_PERIODISITY_MS);
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
  // @brief when another coupon has being used by the user and we couldn't track
  //        it for any reason (could be ours or not... most probably not).
  //
  externalCouponUsed(offerInfo) {
    // TODO: we can get the domain id and cluster id from:
    // offerInfo['appear_on_did']
    // offerInfo['appear_on_cid']
    log('externalCouponUsed');
    const clusterID = offerInfo['appear_on_cid'];
    generateOrAddField(this.currentData['data'], clusterID, 'external_coupons_used', 1);
  }

  //
  // @brief coupon being clicked
  //
  couponClicked(clusterID) {
    log('couponClicked');
    generateOrAddField(this.currentData['data'], clusterID, 'coupons_opened', 1);
  }

  //
  // @brief when the offer is shown in the same domain where the user is
  //
  offerOnSameDomain(clusterID) {
    log('offerOnSameDomain');
    generateOrAddField(this.currentData['data'], clusterID, 'same_domain', 1);
  }

  //
  // @brief when the user comes from the group A (subcluster)
  //
  offerOnUserFromSubcluster(clusterID, subclusterID) {
    log('offerOnUserFromSubcluster ' + subclusterID);
    generateOrAddField(this.currentData['data'], clusterID, 'subcluster_' + subclusterID, 1);
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



