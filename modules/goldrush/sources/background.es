import { utils, events } from 'core/cliqz';
import { DomainInfoDB } from 'goldrush/dbs/domain_info_db';
import ResourceLoader from 'core/resource-loader';
import { OfferFetcher } from 'goldrush/offer_fetcher';
import { OfferManager } from 'goldrush/offer_manager';
// TODO remove the import are not needed from here after removing the tests
import { TopHourFID }  from 'goldrush/fids/top_hour_fid';
import background from 'core/base/background';
import LoggingHandler from 'goldrush/logging_handler';

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

export default background({
  enabled() {
    return true;
  },

  init(settings) {
    // init the logging
    LoggingHandler.init();

    // define all the variables here
    this.db = null;
    // offer manager
    this.offerManager = new OfferManager();

  },

  //////////////////////////////////////////////////////////////////////////////
  start() {
    // nothing to do
  },

  //////////////////////////////////////////////////////////////////////////////
  onLocationChangeHandler(url) {
    if (!this.offerManager) {
      return;
    }
    var u = utils.getDetailsFromUrl(url);
    LoggingHandler.info('background', 'location changed to ' + u.host);

    try {
      this.offerManager.processNewEvent(u);
    } catch (e) {
      // log this error, is nasty, something went wrong
      LoggingHandler.error('background',
                           'Exception catched when processing a new event: ' + e,
                           LoggingHandler.ERR_INTERNAL);
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  unload() {
    log('unloading the background script');

    // destroy classes
    if (this.offerManager) {
      this.offerManager.destroy();
      delete this.offerManager;
      this.offerManager = null;
    }

    // uninit the logging
    LoggingHandler.uninit();
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
          offerManager.uiManager.setCoupon(coupon);
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

  testWritingFile() {
    log('testWritingFile');
    let rscLoader = new ResourceLoader(
      [ 'goldrush', 'saqib', 'user_info.json' ],
      {}
    );
    rscLoader.persist(JSON.stringify({name: 'saqib', ads_shown: true}, null, 4)).then(data => {
      log('data successfully persisted');
    });
  },

  events: {
    'core:coupon-detected': function(args) {
      if(this.offerManager){
        this.offerManager.addCouponAsUsedStats(args['domain'], args['code']);
      }
    }
  }

});
