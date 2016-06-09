import { utils } from 'core/cliqz';
//import Reporter from 'goldrush/reporter';
//import ResourceLoader from 'core/resource-loader';

function log(s){
  utils.log(s, 'GOLDRUSH - StatsHandler');
}

////////////////////////////////////////////////////////////////////////////////
export class StatsHandler {

  constructor(name) {

  }

  //////////////////////////////////////////////////////////////////////////////
  //                            API
  //////////////////////////////////////////////////////////////////////////////



  //
  // @brief collect that a new coupon has being used.
  //
  couponUsed(couponInfo) {
    // TODO: we can get the domain id and cluster id from:
    // couponInfo['shown_on_did']
    // couponInfo['shown_on_cid']
    log('couponUsed');
  }

  //
  // @brief coupon being clicked
  //
  couponClicked(couponInfo) {
    // TODO: we can get the domain id and cluster id from:
    // couponInfo['shown_on_did']
    // couponInfo['shown_on_cid']
    log('couponClicked');
  }

  //
  // @brief when a coupon is clicked to save
  //
  couponSaved(couponInfo) {
    // TODO: we can get the domain id and cluster id from:
    // couponInfo['shown_on_did']
    // couponInfo['shown_on_cid']
    log('couponSaved');
  }

  //
  // @brief when a coupon rejected by the main button
  //
  couponRejected(couponInfo) {
    // TODO: we can get the domain id and cluster id from:
    // couponInfo['shown_on_did']
    // couponInfo['shown_on_cid']
    log('couponRejected');
  }

  //
  // @brief when the ad is closed by the user on the X button
  //
  advertiseClosed(couponInfo) {
    // TODO: we can get the domain id and cluster id from:
    // couponInfo['shown_on_did']
    // couponInfo['shown_on_cid']
    log('advertiseClosed');
  }


  //
  // @brief an ad has being desplayed
  //
  advertiseDisplayed(couponInfo) {
    // TODO: we can get the domain id and cluster id from:
    // couponInfo['shown_on_did']
    // couponInfo['shown_on_cid']
    log('advertiseDisplayed');
  }

  //
  // @brief coupon has being desplayed
  //
  couponDisplayed(couponInfo) {
    // TODO
    log('couponDisplayed');
  }

  //
  // @brief user bought or is in the checkout page
  //
  userProbablyBought(domainID, clusterID) {
    // TODO
    log('userProbablyBought');
  }

  //
  // @brief system intention detected
  //
  systemIntentionDetected(domainID, clusterID) {
    // TODO
    log('systemIntentionDetected');
  }

}



