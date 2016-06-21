import { utils } from 'core/cliqz';
//import Reporter from 'goldrush/reporter';
import ResourceLoader from 'core/resource-loader';

Components.utils.import('chrome://cliqzmodules/content/CliqzHandlebars.jsm');

function log(s){
  utils.log(s, 'GOLDRUSH - UI MANAGER');
}


////////////////////////////////////////////////////////////////////////////////
function getIDNameFromOfferID(offerID) {
  return 'offers-' + offerID;
}



////////////////////////////////////////////////////////////////////////////////
export function UIManager() {
  // the current offer map clusterID -> offer
  this.currentOfferMap = {};
  // the callbacks list
  this.callbacks = null;
  // the template of handle bars already compiled
  this.htmlHandlebarTemplate = null;

  // load the html and compile the handlebars directly here only once
  let rscLoader = new ResourceLoader([ 'goldrush', 'voucher.html' ],
                                     {dataType: 'raw'});
  var self = this;
  rscLoader.load().then(html => {
    self.htmlHandlebarTemplate = CliqzHandlebars.compile(html);
});
}


//////////////////////////////////////////////////////////////////////////////
//                          "PRIVATE" METHODS
//////////////////////////////////////////////////////////////////////////////


//
// @brief this method will create the string / document fragment we need to
//        construct for the offerInfo itself
//
UIManager.prototype.createCouponDisplay = function(offerInfo) {
  if (!this.htmlHandlebarTemplate) {
    // nothing to do here..
    log('we still dont have the handlebar template here...');
    return;
  }

  const coupon = offerInfo.voucher_data;

  var document = CliqzUtils.getWindow().document;
  if (!document) {
    return false;
  }

  // check if we have the element here already to not re-create it
  var messageContainer = document.getElementById('cqz-voucher-msg-cont');
  if (!messageContainer) {
    messageContainer = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
  }
  var documentFragment = document.getElementById('cqz-voucher-doc-frag');
  if (!documentFragment) {
    documentFragment = document.createDocumentFragment();
  }

  messageContainer.innerHTML = this.htmlHandlebarTemplate({title: coupon.title, code: coupon.code, desc: coupon.desc, min_order_value: coupon.min_order_value, valid_for: coupon.valid_for, image_url: coupon.image_url});
  documentFragment.appendChild(messageContainer);

  return documentFragment;
};


//////////////////////////////////////////////////////////////////////////////
//                          "PUBLIC" METHODS
//////////////////////////////////////////////////////////////////////////////



//////////////////////////////////////////////////////////////////////////////
// TODO: we should add here all the methods to get the callbacks and to track the
// information (like mouse over / ticket clicked / etc)


//////////////////////////////////////////////////////////////////////////////
//
// @brief configure callbacks
// @param callbacks: an object with the following properties.
//  {
//    'show_coupon': callback, -> will show the coupon and redirect to web.
//    'not_interested': callback -> will just cancel this and maybe don't show it again for a while.
//    'information': callback -> when the user clicks on the information icon
//    'extra_events': callback -> any other extra events from the notification bar
//    // internal callbacks
//    'on_offer_shown' : callback(offerInfo) -> when we actually show an offer
//    'on_offer_hide' : callback(offerInfo) -> when the offer is hiden
//  }
//
UIManager.prototype.configureCallbacks = function(callbacks) {
  this.callbacks = callbacks;
};


//////////////////////////////////////////////////////////////////////////////
//
// @brief check if there is an offer from a specific cluster being shown in this
//        window
// @return true if it is | false otherwise
//
UIManager.prototype.isOfferForClusterShownInCurrentWindow = function(clusterID) {
  const offerInfo = this.currentOfferMap[clusterID];
  if (offerInfo === undefined) {
    return false;
  }

  var currWindow = CliqzUtils.getWindow();
  if (!currWindow) {
    return false;
  }
  var gBrowser = currWindow.gBrowser;
  var box = gBrowser.getNotificationBox();

  // try first to remove the current one if we have one so we only show one element
  let currentNotification = box.getNotificationWithValue(getIDNameFromOfferID(offerInfo['offer_id']));
  return (!currentNotification) ? false : true;
};

//////////////////////////////////////////////////////////////////////////////
//
// @brief show an offer in the current window and set it as the current one
// @param filterGoToOffer will indicate if we need to add this button or not
//                        in the list
//
UIManager.prototype.showOfferInCurrentWindow = function(offerInfo, filterGoToOffer=false) {
  if (!this.callbacks) {
    log('no callbacks set yet... we cannot add any coupon to the UI');
    return false;
  }

  // else we need to add it here
  const clusterID = offerInfo['appear_on_cid'];
  this.currentOfferMap[clusterID] = offerInfo;

  var currWindow = CliqzUtils.getWindow();
  if (!currWindow) {
    return false;
  }

  // get the notification box and build whatever we want to show (style) here.
  // TODO: we need to style this, for now we will not, only in a nasty way.
  var notificationContent = this.createCouponDisplay(offerInfo);
  if (!notificationContent) {
    log('we couldnt create the coupon display');
    return false;
  }

  // build the buttons callbacks
  // TODO_QUESTION: localize buttons and content?
  var buttons = [];

  if (!filterGoToOffer) {
    // show coupon
    buttons.push({
      label : 'Go to Offer',
      accessKey : '1',
      callback : this.callbacks['show_coupon']
    });
  }

  // not interested in this
  buttons.push({
    label : 'Not interested',
    accessKey : '3',
    callback : this.callbacks['not_interested']
  });

  // go and fu** urself
  buttons.push({
    label : 'More Info',
    accessKey : '4',
    callback : this.callbacks['information']
  });

  // now get the notification box and create it
  // TODO_QUESTION: modify the priority? which one we should use + icon?
  var gBrowser = currWindow.gBrowser;
  var box = gBrowser.getNotificationBox();

  // remove the coupon notification if there is one
  // let couponNotification = box.getNotificationWithValue('goldrush-coupon');
  // if (couponNotification) {
  //   // TODO: make sure the close callback is not calling this method again (recursion loop)
  //   box.removeNotification(couponNotification);
  // }

  const offerNameID = getIDNameFromOfferID(offerInfo['offer_id']);
  var notification = box.appendNotification(notificationContent,
                                            offerNameID,
                                            null,
                                            box.PRIORITY_WARNING_MEDIUM,
                                            buttons,
                                            this.callbacks['extra_events']);

  notification.style.backgroundColor = "#f6f6f6";
  notification.style.borderBottom = "1px solid #dedede";
  // call the callback that we are showing the offer here

  var couponElement = currWindow.document.getElementById('coupon');

  if (couponElement) {
    couponElement.onclick = function () {
      //var gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper);
      //gClipboardHelper.copyString(this.innerHTML);
      CLIQZEnvironment.copyResult(this.innerHTML);
    };
}

  // call the callback that we are showing the offer here
  if (this.callbacks.on_offer_shown) {
    this.callbacks.on_offer_shown(offerInfo);
  }

  return true;
};


//////////////////////////////////////////////////////////////////////////////
//
// @brief hide the current coupon of the current window
//
UIManager.prototype.hideOfferOfClusterFromCurrentWindow = function(clusterID) {
  const offerInfo = this.currentOfferMap[clusterID];
  if (!offerInfo || offerInfo['offer_id'] === undefined) {
    return false;
  }

  var currWindow = CliqzUtils.getWindow();
  if (!currWindow) {
    return false;
  }
  var gBrowser = currWindow.gBrowser;
  var box = gBrowser.getNotificationBox();
  const offerNameID = getIDNameFromOfferID(offerInfo['offer_id']);

  // try first to remove the current one if we have one so we only show one element
  let currentNotification = box.getNotificationWithValue(offerNameID);
  if (currentNotification) {
    box.removeNotification(currentNotification);

    // call the callback notifying this
    if (this.callbacks.on_offer_hide) {
      this.callbacks.on_offer_hide(offerInfo);
    }
  }
};




