import { utils } from 'core/cliqz';
//import Reporter from 'goldrush/reporter';
import ResourceLoader from 'core/resource-loader';
import GoldrushConfigs from 'goldrush/goldrush_configs';

Components.utils.import('chrome://cliqzmodules/content/CliqzHandlebars.jsm');


////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'ui_manager';


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
    GoldrushConfigs.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'we still dont have the handlebar template here...');
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
//
// @brief configure callbacks
// @param callbacks: an object with the following properties.
//  {
//    'show_coupon': callback(offerID), -> will show the coupon and redirect to web.
//    'not_interested': callback(offerID) -> will just cancel this and maybe don't show it again for a while.
//    'information': callback(offerID) -> when the user clicks on the information icon
//    'extra_events': callback(offerID) -> any other extra events from the notification bar
//    'close_btn_clicked': callback(offerID) -> when user closed on the X button
//    // internal callbacks
//    'on_offer_shown' : callback(offerID) -> when we actually show an offer
//    'on_offer_hide' : callback(offerID) -> when the offer is hiden
//    'cp_to_clipboard' : callback(offerID) -> when the coupon is clicked to save it on the clipboard
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
    GoldrushConfigs.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'no callbacks set yet... we cannot add any coupon to the UI');
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
  var notificationContent = this.createCouponDisplay(offerInfo);
  if (!notificationContent) {
    GoldrushConfigs.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'we couldnt create the coupon display',
                         LoggingHandler.ERR_INTERNAL);
    return false;
  }

  // build the buttons callbacks
  var buttons = [];

  // store the current offer id we want to track
  const offerID = offerInfo.offer_id;

  if (!filterGoToOffer) {
    // show coupon
    buttons.push({
      label : 'Zum Angebot',
      accessKey : '1',
      callback : function () {
        if (self.callbacks.show_coupon) {
          return self.callbacks.show_coupon(offerID);
        }
      }
    });
  }

  // not interested in this
  buttons.push({
    label : 'Kein Interesse',
    accessKey : '3',
    callback : function () {
        if (self.callbacks.not_interested) {
          return self.callbacks.not_interested(offerID);
        }
      }
  });

  // go and fu** urself
  buttons.push({
    label : 'Weitere Informationen',
    accessKey : '4',
    callback : function () {
        if (self.callbacks.information) {
          return self.callbacks.information(offerID);
        }
      }
  });

  // now get the notification box and create it
  var gBrowser = currWindow.gBrowser;
  var box = gBrowser.getNotificationBox();

  const offerNameID = getIDNameFromOfferID(offerInfo['offer_id']);
  var notification = box.appendNotification(notificationContent,
                                            offerNameID,
                                            null,
                                            box.PRIORITY_WARNING_MEDIUM,
                                            buttons,
                                            function(reason) {
                                              if (self.callbacks.extra_events) {
                                                return self.callbacks.extra_events(reason, offerID);
                                              }
                                            });

  notification.style.backgroundColor = "#f6f6f6";
  notification.style.borderBottom = "1px solid #dedede";

  // get the coupon element and set the callback when the user click on it
  var couponElement = currWindow.document.getElementById('cliqz-coupon');
  var self = this;
  if (couponElement) {
    couponElement.onclick = function () {
      CLIQZEnvironment.copyResult(this.innerHTML);
      if (self.callbacks.cp_to_clipboard) {
        self.callbacks.cp_to_clipboard(offerID);
      }
    };
  }

  try {
    // closing button
    let notificationBox = currWindow.gBrowser.getNotificationBox().getElementsByTagName("notification")[0];
    let notificationBoxClosing = notificationBox.boxObject.firstChild.getElementsByTagName("xul:toolbarbutton")[0];
    notificationBoxClosing.addEventListener("click", function(){
      if (self.callbacks.close_btn_clicked) {
        self.callbacks.close_btn_clicked(offerID);
      }
    });
  } catch (e) {
    GoldrushConfigs.LOG_ENABLED &&
    LoggingHandler.error(MODULE_NAME,
                         'We couldnt get the code button from the ui to link it with ' +
                         'the copyToClipboard feature. Description: ' + e,
                         LoggingHandler.ERR_INTERNAL);
  }


  // call the callback that we are showing the offer here
  if (this.callbacks.on_offer_shown) {
    this.callbacks.on_offer_shown(offerID);
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




