import { utils } from 'core/cliqz';
//import Reporter from 'goldrush/reporter';
//import ResourceLoader from 'core/resource-loader';

function log(s){
  utils.log(s, 'GOLDRUSH - UI MANAGER');
}


////////////////////////////////////////////////////////////////////////////////
export function UIManager() {
  // the current coupon
  this.currentCoupon = null;
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
//    'information': callback -> when the user clicks on the information icon
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

<<<<<<< HEAD
  // if (this.currentCoupon && this.currentCoupon['coupon_id'] === couponInfo['coupon_id']) {
  //   // nothing to do
  //   log('we already have this coupon: ' + couponInfo['coupon_id']);
  //   return false;
  // }

=======
>>>>>>> 86520f9dc88b65fe8d57226bc4ba8b2ae7fba799
  // the coupon should have the state
  // if (!couponInfo.hasOwnProperty('used_state')) {
  //   log('state has no \'used_state\', we will set it to false');
  //   couponInfo['used_state'] = false;
  // }

  // else we need to add it here
  this.currentCoupon = couponInfo;

  // TODO: here we need to update the UI
  // REMOVE THIS LATER


  // we show the coupon properly
  return this.showCurrentCouponAdd();
};

//////////////////////////////////////////////////////////////////////////////
//
// @brief this method will show the add of the current coupon if any
//
UIManager.prototype.showCurrentCouponAdd = function() {
  var couponInfo = this.currentCoupon;
  if (!couponInfo) {
    return false;
  }

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

  // TODO: also remove the second notification box if we are showing it (the second)
  //

  var notification = box.appendNotification(notificationContent,
                                            'goldrush-ad',
                                            'chrome://cliqz/content/static/skin/cliqz_btn.png',
                                            box.PRIORITY_WARNING_MEDIUM,
                                            buttons,
                                            this.callbacks['extra_events']);

  return true;
};


//////////////////////////////////////////////////////////////////////////////
//
// @brief return the current coupon | null if none
//
UIManager.prototype.getCurrentCoupon = function() {
  return this.currentCoupon;
};


//////////////////////////////////////////////////////////////////////////////
//
// @brief show the current coupon information in the second notification box.
//
UIManager.prototype.showCouponInfo = function(couponInfo) {
  if (!this.currentCoupon) {
    log('we dont have a coupon to show so we will just do nothing');
    return;
  }

  var currWindow = CliqzUtils.getWindow();
  if (!currWindow) {
    return false;
  }

  // we have a coupon to show here so we will just show the dummy thing
  var buttons = [];
  // TODO: hacky thing
  var self = this;

  // show coupon
  buttons.push({
    label : 'Save Coupon',
    accessKey : '1',
    callback : function() {
      self.showCurrentCouponAdd();
    }
  });

  // save coupon
  buttons.push({
    label : 'Go to offer',
    accessKey : '2',
    callback : function() {
      self.showCurrentCouponAdd();
    }
  });

  // now get the notification box and create it
  // TODO_QUESTION: modify the priority? which one we should use + icon?
  var gBrowser = currWindow.gBrowser;
  var box = gBrowser.getNotificationBox();

  // try first to remove the current one if we have one so we only show one element
  let currentNotification = box.getNotificationWithValue('goldrush-coupon');
  if (currentNotification) {
    box.removeNotification(currentNotification);
  }

  // TODO: also remove the second notification box if we are showing it (the second)
  //

  var notification = box.appendNotification('BRAND | PICTURE | TEXT | CODE',
                                            'goldrush-coupon',
                                            'chrome://cliqz/content/static/skin/cliqz_btn.png',
                                            box.PRIORITY_WARNING_MEDIUM,
                                            buttons,
                                            function(reason) {
                                              if (reason === 'removed') {
                                                self.showCurrentCouponAdd();
                                              }
                                            });
};

//////////////////////////////////////////////////////////////////////////////
//
// @brief change the state of a coupon in the list (used / not used)
// @param couponID the coupon we want to modify
//
UIManager.prototype.changeCouponState = function(couponID, newState) {
  if (!this.currentCoupon || this.currentCoupon['coupon_id'] !== couponID) {
    log('warning: we dont have the coupon to update its state with ID: ' + couponID);
    return;
  }

  // we have the coupon so we modify it and update the ui
  let currState = this.currentCoupon['used_state'];
  if (currState === newState) {
    return;
  }
  this.currentCoupon['used_state'] = newState;

  // TODO: update the ui here to show the new state of the coupons.
};

//////////////////////////////////////////////////////////////////////////////
//
// @brief remove a coupon from the list
// @param couponID
//
UIManager.prototype.removeCoupon = function(couponID) {
  if (!this.currentCoupon || this.currentCoupon['coupon_id'] !== couponID) {
    log('warning: we dont have the coupon to remove it with ID: ' + couponID);
    return;
  }

  delete this.currentCoupon;
  this.currentCoupon = null;

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




