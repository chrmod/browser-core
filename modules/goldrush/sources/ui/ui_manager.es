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
  // the callbacks list
  this.callbacks = null;
}

// TODO_QUESTION: check how is the best way to implement all those methods.


// TODO: we should add here all the methods to get the callbacks and to track the
// information (like mouse over / ticket clicked / etc)

//////////////////////////////////////////////////////////////////////////////
//
// @brief configure callbacks
// @param callbacks: an object with the following properties.
//  {
//    'show_coupon': callback, -> will show the coupon and redirect to web.
//    'save_coupon': callback, -> will show a message to the user or redirect to some other special web.
//    'not_interested': callback -> will just cancel this and maybe don't show it again for a while.
//    'stop_forever': callback -> when the user don't want to see this any more in his current and future lifes.
//    'extra_events': callback -> any other extra events from the notification bar
//  }
//
UIManager.prototype.configureCallbacks = function(callbacks) {
  this.callbacks = callbacks;
};


//////////////////////////////////////////////////////////////////////////////
//
// @brief add a coupon to the list of the pop up
// @param couponInfo is the coupon object containing the information of it.
// @return true if we were able to show or not the coupon | false otherwise
//
UIManager.prototype.addCoupon = function(couponInfo) {
  if (!this.callbacks) {
    log('no callbacks set yet... we cannot add any coupon to the UI');
    return false;
  }

  if (this.couponsMap.hasOwnProperty(couponInfo['coupon_id'])) {
    // nothing to do
    log('we already have this coupon: ' + couponInfo['coupon_id']);
    return false;
  }

  // the coupon should have the state
  // if (!couponInfo.hasOwnProperty('used_state')) {
  //   log('state has no \'used_state\', we will set it to false');
  //   couponInfo['used_state'] = false;
  // }

  // else we need to add it here
  this.couponsMap[couponInfo['coupon_id']] = couponInfo;

  // TODO: here we need to update the UI
  // REMOVE THIS LATER
  var currWindow = CliqzUtils.getWindow();
  if (!currWindow) {
    return false;
  }

  const code = couponInfo['code'];
  const title = couponInfo['title'];
  const price = couponInfo['price'];
  const redirectURL = couponInfo['redirect_url'];
  const imageURL = couponInfo['image_url'];
  const description = couponInfo['desc'];

  // get the notification box and build whatever we want to show (style) here.
  // TODO: we need to style this, for now we will not, only in a nasty way.
  var notificationContent = 'Hey there, there is a coupon for you (bla bla): ';
  notificationContent += 'Coupon: ' + title;
  notificationContent += '\tPrice: ' + price;

  // build the buttons callbacks
  // TODO_QUESTION: localize buttons and content?
  var buttons = [];

  // show coupon
  buttons.push({
    label : 'Show Coupon',
    accessKey : '1',
    callback : this.callbacks['show_coupon']
  });

  // save coupon
  buttons.push({
    label : 'Save Coupon',
    accessKey : '2',
    callback : this.callbacks['save_coupon']
  });

  // not interested in this
  buttons.push({
    label : 'Not interested',
    accessKey : '3',
    callback : this.callbacks['not_interested']
  });

  // go and fu** urself
  buttons.push({
    label : 'Stop bothering me',
    accessKey : '4',
    callback : this.callbacks['stop_forever']
  });

  // now get the notification box and create it
  // TODO_QUESTION: modify the priority? which one we should use + icon?
  var gBrowser = currWindow.gBrowser;
  var box = gBrowser.getNotificationBox();

  // try first to remove the current one if we have one so we only show one element
  let currentNotification = box.getNotificationWithValue('goldrush-ad');
  if (currentNotification) {
    box.removeNotification(currentNotification);
  }

  var notification = box.appendNotification(notificationContent,
                                            'goldrush-ad',
                                            'chrome://cliqz/content/static/skin/cliqz_btn.png',
                                            box.PRIORITY_WARNING_MEDIUM,
                                            buttons,
                                            this.callbacks['extra_events']);

  // we show the coupon properly
  return true;
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




