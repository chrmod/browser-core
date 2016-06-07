import { utils, events } from 'core/cliqz';
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


////////////////////////////////////////////////////////////////////////////////
function parseMappingsFileAsPromise(filename) {
  return new Promise(function(resolve, reject) {
    let rscLoader = new ResourceLoader(
      [ 'goldrush', filename ],
      {}
    );

    rscLoader.load().then(json => {
      // now we parse the data and return this
      log(json);

      resolve(json);
    });
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
    log('init');
    this.offerManager = new OfferManager();
    log('after offer manager');

    // nothing to do for now

    // subscribe this method also
    events.sub( 'core.location_change', this.onLocationChangeHandler.bind(this) );

    // load the popup button

  },

  start() {

    // nothing to do
    log('starting the background script');

    return;
  },

  onLocationChangeHandler(url) {
    var u = utils.getDetailsFromUrl(url);
    log('location changed to ' + u.host);
    // TODO: remove this is temporary

    // this.offerManager.uiManager.addCoupon({
    //   'coupon_id':u.host,
    //   'used_state' : true,
    //   'title': u.host,
    //   'price': Math.random(),
    //   'redirect_url' : u.host
    // });

  },

  testOfferFetcher() {
    let destURL = 'http://mixer-beta.clyqz.com/api/v1/rich-header?path=/map&bmresult=vouchers.cliqz.com&';
    var offerManager = this.offerManager;
    log('reading the mappings file to fetch vouchers');
    parseMappingsFileAsPromise('mappings.json').then(function(values) {
      log('checking for vouchers in the backend');
      let offerFetcher = new OfferFetcher(destURL, values);
      offerFetcher.checkForCouponsByCluster(0, function(vouchers) {
        log('received vouchers');
        // TODO: remove this
        // we will pick the first or any one here.
        var coupon = null;
        for (var did in vouchers) {
          if (!vouchers.hasOwnProperty(did)) {
            continue;
          }
          if (coupon !== null) {
            break;
          }
          var vouchersList = vouchers[did];
          if (vouchersList.length > 0) {
            coupon = vouchersList[0];
          }
        }
        if (coupon) {
          offerManager.uiManager.addCoupon(coupon);
        }
      });
      offerFetcher.checkForCouponsByCluster(1, function(vouchers) {
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

    // unsubscribe this class
    events.un_sub( 'core.location_change', this.onLocationChangeHandler.bind(this) );
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
