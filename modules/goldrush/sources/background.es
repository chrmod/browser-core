import { utils, events } from 'core/cliqz';
import Reporter from 'goldrush/reporter';
import { DateTimeDB } from 'goldrush/dbs/datetime_db';
import { GeneralDB } from 'goldrush/dbs/general_db';
import { DomainInfoDB } from 'goldrush/dbs/domain_info_db';
import ResourceLoader from 'core/resource-loader';
import CliqzGoldrushPopupButton from 'goldrush/ui/popup-button';
import { OfferFetcher } from 'goldrush/offer_fetcher';
import { OfferManager } from 'goldrush/offer_manager';
import { TopHourFID }  from 'goldrush/fids/top_hour_fid';
//import { FID } from 'goldrush/fids/fid';

function log(s){
  utils.log(s, 'GOLDRUSH - background');
}


//////////////////////////////////////////////////////////////////////////////
// TODO: remove all this test code
// TESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTEST

function parseHttpResponse(httpResp) {
  var vouchers = null;
  try {
      var jResp = JSON.parse(httpResp);
      vouchers = jResp['results'][0]['data']['vouchers'];
    } catch (e) {
      log('Error parsing the httpResp:\n' + httpResp + '\nwith error: ' + e);
    }
    return vouchers;
}

function testHttpRequest() {
  let destURL = 'http://mixer-beta.clyqz.com/api/v1/rich-header?path=/map&bmresult=vouchers.cliqz.com&' + 'q=' + 'get|cluster_id=0';

  // perform the call and wait for the response
  log('we will hit the endpoint: ' + destURL);

  var vouchers = null;
  CliqzUtils.httpGet(destURL, function success(res) {
      vouchers = parseHttpResponse(res.response);
      log('voucher received: ');
      log(vouchers);
    }, function error(_) {
      // TODO: will be gut if we can track this information
      // TODO_QUESTION: how do we can track this information and report it back?
      //                or any error in general?
      log('error getting the coupongs from the backend?');
    }
  );

  log('http request end');
  return vouchers;
}

function executePromiseAll() {
  var counter = 0;
  var p1 = new Promise(function(resolve, reject) {
    log('counter p1 executing');
    counter++;
    resolve(3);
  });
  var p2 = new Promise(function(resolve, reject) {
    log('counter p2 executing');
    counter++;
    resolve(4);
  });
  Promise.all([p1,p2]).then(function(values) {
    log('values of promise: ' + values + ' and value of counter: ' + counter);
  });
}

// TESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTEST
//////////////////////////////////////////////////////////////////////////////





export default {
  init(settings) {
    // define all the variables here
    this.db = null;
    this.offerManager = null;

    // construct the offer manager
    this.offerManager = new OfferManager();

    // nothing to do for now
    log('Initializing the background script');
    this.db = new DateTimeDB();
    log('DateTimeDB: ' + this.db.databaseName());

  // TODO remove all this temporary code
    this.loader = new ResourceLoader(
      [ 'goldrush', 'clusters', 'food_delivery.dbinfo' ],
      {}
    );

    log('reading food_delivery');
    let foodDelivery = this.loader.load();
    this.loader.load().then( categories => {
      this.db.loadFromDict(categories['datetime_db']);
      log('done reading food_delivery');
      log(categories);
    });
    log('after reading food_delivery ' + foodDelivery);
    log(foodDelivery);

    // load the popup button
    utils.bindObjectFunctions(this.couponPopupActions, this);
    this.popup = new CliqzGoldrushPopupButton({
        name: 'goldrush',
        actions: this.couponPopupActions
      });
    this.popup.attach();
    this.popup.updateState(utils.getWindow(), false);
    log('popup button created');

  },

  start() {

    // nothing to do
    log('starting the background script');
    this.reporter = new Reporter(0);

     // TODO: remove this test
    executePromiseAll();
    log('test testHttpRequest');
    testHttpRequest();


    this.reporter.start();
    events.sub( 'core.location_change', this.reporter.assess.bind(this.reporter) );
    log('show the popup');
    this.popup.showPopUp();

    return;
  },

  testOfferFetcher() {
    let destURL = 'http://mixer-beta.clyqz.com/api/v1/rich-header?path=/map&bmresult=vouchers.cliqz.com&';
    let offerManager = this.offerManager;
    offerManager.parseMappingsFileAsPromise('mappings.json').then(function(values) {
      let offerFetcher = new OfferFetcher(destURL, values);
      offerFetcher.checkForCouponsByCluster(1, function(vouchers) {
        log('received vouchers');
      });
      offerFetcher.checkForCouponsByCluster(0, function(vouchers) {
        log('received vouchers');
      });
      offerFetcher.isCouponUsed('0-1-0', function(isUsed) {
        log('coupon: 0-1-0 is_used: ' + isUsed);
      });
      offerFetcher.isCouponUsed('0-1-10', function(isUsed) {
        log('coupon: 0-1-10 is_used: ' + isUsed);
      });
      offerFetcher.markCouponAsUsed('0-1-10');
      offerFetcher.markCouponAsUsed('0-1-0');
    });
    return;
  },

  testDBs() {
    // nothing to do for now
    log('testDBs');
    this.db = new DomainInfoDB();
    log('GeneralDB: ' + this.db.databaseName());

  // TODO remove all this temporary code
    this.loader = new ResourceLoader(
      [ 'goldrush', 'clusters', 'food_delivery.dbinfo' ],
      {}
    );

    this.loader.load().then( categories => {
      this.db.loadFromDict(categories['domain_info_db']);
    });

    return;
  },

  testFIDs() {
    log('testFIDs');
    let fids = new TopHourFID();
    log(fids.detectorName);
  },

  unload() {
    log('unloading the background script');
    if ( this.reporter ) {
      events.un_sub( 'core.location_change', this.reporter.assess.bind(this.reporter) );
      this.reporter.stop();
    }

    // unload popup button
    if (this.popup) {
      this.popup.destroy();
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  // Popup button actions
  //
  couponPopupActions: {
    ////////////////////////////////////////////////////////////////////////////
    // goldrush
    //
/*

    // TODO: maybe we want to move part of this logic to somewhere else (like OfferManager?)

    //
    // @brief called when someone clicks on the cupon to show the coupon code
    //        (to track more events from the user)
    //
    onShowCouponCode(args, cb) {

      // TODO_QUESTION: why is this cb needed?
      cb();
    },

    //
    // @brief when the user clicked on the coupon link.
    //        We need to provide the coupon ID.
    //
    onCouponClicked(args, cb) {
      // TODO?
    },

    //
    // @brief when user perfom some operation on the coupon we want to track
    //        (mouse over? whatever we want to track).
    //        We need to provide the coupon ID.
    //
    onCouponEventHappened(args, cb) {
      // TODO: we need to also implement all the js in the client.
      // TODO_QUESTION: ask how we can implement the popup.js to call this methods
      //                (mouse over and more...)
    },
*/



  //////////////////////////////////////////////////////////////////////////////
  // old
    getPopupCouponsData(args, cb) {
      log('getPopupCouponsData: getting the coupons from the offer manager: ');
      //cb({});
      // if (!this.offerManager) {
      //   return;
      // }
      // cb(this.offerManager.getCurrentCoupons());


      /*var info = CliqzAttrack.getCurrentTabBlockingInfo();

      cb({
        url: info.hostname,
        cookiesCount: info.cookies.blocked,
        requestsCount: info.requests.unsafe,
        enabled: utils.getPref('antiTrackTest'),
        isWhitelisted: CliqzAttrack.isSourceWhitelisted(info.hostname),
        reload: info.reload || false,
        trakersList: info
      });*/
    }
  }
};
