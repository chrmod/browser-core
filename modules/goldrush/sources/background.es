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
    if (this.offerManager) {
      this.offerManager.processNewEvent(u);
    } else {
      log('no offerManager object');
    }
    // TODO: remove this is temporary

    // this.offerManager.uiManager.addCoupon({
    //   'coupon_id':u.host,
    //   'used_state' : true,
    //   'title': u.host,
    //   'price': Math.random(),
    //   'redirect_url' : u.host
    // });

  },

  unload() {
    log('unloading the background script');

    // unsubscribe this class
    events.un_sub( 'core.location_change', this.onLocationChangeHandler.bind(this) );

    // destroy classes
    if (this.offerManager) {
      this.offerManager.destroy();
      delete this.offerManager;
      this.offerManager = null;
    }
  },



  //////////////////////////////////////////////////////////////////////////////
  //                          TESTS
  //////////////////////////////////////////////////////////////////////////////

  testOfferFetcher() {
    let destURL = 'http://mixer-beta.clyqz.com/api/v1/rich-header?path=/map&bmresult=vouchers.cliqz.com&';
    var offerManager = this.offerManager;
    log('reading the mappings file to fetch vouchers');
    parseMappingsFileAsPromise('mappings.json').then(function(values) {
      log('checking for vouchers in the backend');
      let offerFetcher = new OfferFetcher(destURL, values);
      offerFetcher.checkForCouponsByCluster(4, function(vouchers) {
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

};
