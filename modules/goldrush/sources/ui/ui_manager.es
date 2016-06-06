import { utils } from 'core/cliqz';
//import Reporter from 'goldrush/reporter';
//import ResourceLoader from 'core/resource-loader';

function log(s){
  utils.log(s, 'GOLDRUSH - UI MANAGER');
}


////////////////////////////////////////////////////////////////////////////////
export function UIManager() {
  // the list of coupons we have
  this.couponsMap = {};
}

// TODO_QUESTION: check how is the best way to implement all those methods.


// TODO: we should add here all the methods to get the callbacks and to track the
// information (like mouse over / ticket clicked / etc)

//////////////////////////////////////////////////////////////////////////////
//
// @brief configure callbacks
// @param
//
UIManager.prototype.configureCallbacks = function(show) {
  // TODO: configure all the callbacks and also set the internal callbacks of
  //       the popup, that will re-call all the internal callbacks as well.
};


//////////////////////////////////////////////////////////////////////////////
//
// @brief add a coupon to the list of the pop up
// @param couponInfo is the coupon object containing the information of it.
//
UIManager.prototype.addCoupon = function(couponInfo) {
  if (this.couponsMap.hasOwnProperty(couponInfo['id'])) {
    // nothing to do
    log('we already have this coupon: ' + couponInfo['id']);
    return;
  }

  // the coupon should have the state
  if (!couponInfo.hasOwnProperty('used_state')) {
    log('state has no \'used_state\', we will set it to false');
    couponInfo['used_state'] = false;
  }

  // else we need to add it here
  this.couponsMap[couponInfo['id']] = couponInfo;

  // TODO: here we need to update the UI
  var currWindow = CliqzUtils.getWindow();
  if (!currWindow) {
    return;
  }
  const toolbar = currWindow.document.createElement('toolbar');
  const iframe = currWindow.document.createElement('iframe');
  const bottomBox = currWindow.document.querySelector('#browser-bottombox');
  bottomBox.appendChild(toolbar);
  iframe.setAttribute('src', 'chrome://cliqz/content/goldrush/ad1.html');
  toolbar.appendChild(iframe);
};

//////////////////////////////////////////////////////////////////////////////
//
// @brief change the state of a coupon in the list (used / not used)
// @param couponID the coupon we want to modify
//
UIManager.prototype.changeCouponState = function(couponID, newState) {
  if (!this.couponsMap.hasOwnProperty[couponID]) {
    log('warning: we dont have the coupon to update its state with ID: ' + couponID);
    return;
  }

  // we have the coupon so we modify it and update the ui
  let currState = this.couponsMap[couponID]['used_state'];
  if (currState === newState) {
    return;
  }
  this.couponsMap[couponID]['used_state'] = newState;

  // TODO: update the ui here to show the new state of the coupons.
};

//////////////////////////////////////////////////////////////////////////////
//
// @brief remove a coupon from the list
// @param couponID
//
UIManager.prototype.removeCoupon = function(couponID) {
  if (!this.couponsMap.hasOwnProperty[couponID]) {
    log('warning: we dont have the coupon to remove it with ID: ' + couponID);
    return;
  }

  delete this.couponsMap[couponID];

  // TODO: update the ui here to show the new state of the coupons.
};

//////////////////////////////////////////////////////////////////////////////
//
// @brief show / hide the popup to the user
// @param show if true => will show, if false => hide
//
UIManager.prototype.showPopup = function(show) {
  // TODO: show / hide the popup
};




