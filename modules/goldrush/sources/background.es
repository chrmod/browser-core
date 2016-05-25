import { utils, events } from 'core/cliqz';
import Reporter from 'goldrush/reporter';
import {DateTimeDB} from 'goldrush/dbs/datetime_db';
import ResourceLoader from 'core/resource-loader';
import {CliqzPopupButton} from 'goldrush/ui/popup-button';
//import {OfferFetcher} from 'goldrush/offer_fetcher';

function log(s){
  utils.log(s, 'GOLDRUSH');
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
  let destURL = 'http://mixer-beta.clyqz.com/api/v1/rich-header?path=/map&bmresult=vouchers.cliqz.com&' + 'q=' + 'amazon.de';

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



// TESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTESTTEST
//////////////////////////////////////////////////////////////////////////////





export default {
  init(settings) {
    // nothing to do for now
    log('Initializing the background script');
    this.db = new DateTimeDB();
    log('DateTimeDB: ' + this.db.databaseName());

    this.loader = new ResourceLoader(
      [ 'goldrush', 'food_delivery.dbinfo' ],
      {}
    );

    this.loader.load().then( categories => {
      this.db.loadFromDict(categories);
    });

    // load the popup button
    utils.bindObjectFunctions(this.popupActions, this);
    this.popup = new CliqzPopupButton({
        name: 'goldrush',
        actions: this.popupActions
      });
    this.popup.attach();
    this.popup.updateState(utils.getWindow(), false);
    log('popup created:' + this.popup);
  },

  start() {
    // nothing to do
    log('starting the background script');
    this.reporter = new Reporter(0);

     // TODO: remove this test
    log('test testHttpRequest');
    testHttpRequest();

    this.reporter.start();
    events.sub( 'core.location_change', this.reporter.assess.bind(this.reporter) );
    log('show the popup');
    this.popup.showPopUp();

    return;
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
  popupActions: {
    ////////////////////////////////////////////////////////////////////////////
    // goldrush
    //


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
      // TODO
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




  //////////////////////////////////////////////////////////////////////////////
  // old
    getPopupData(args, cb) {
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
    },

    toggleAttrack(args, cb) {
      /*var currentState = utils.getPref('antiTrackTest');

      if (currentState) {
        CliqzAttrack.disableModule();
      } else {
        CliqzAttrack.enableModule();
      }

      this.popup.updateState(utils.getWindow(), !currentState);

      cb();

      this.popupActions.telemetry( {action: 'click', 'target': (currentState ? 'deactivate' : 'activate')} )*/
    },

    closePopup(_, cb) {
      this.popup.tbb.closePopup();
      cb();
    },

    toggleWhiteList(args, cb) {
      /*
      var hostname = args.hostname;
      if (CliqzAttrack.isSourceWhitelisted(hostname)) {
        CliqzAttrack.removeSourceDomainFromWhitelist(hostname);
        this.popupActions.telemetry( { action: 'click', target: 'unwhitelist_domain'} );
      } else {
        CliqzAttrack.addSourceDomainToWhitelist(hostname);
        this.popupActions.telemetry( { action: 'click', target: 'whitelist_domain'} );
      }
      cb();*/
    },
    updateHeight(args, cb) {
      log('updateHeight called');
      this.popup.updateView(utils.getWindow(), args[0]);
    },

    telemetry(msg) {
      /*
      if ( msg.includeUnsafeCount ) {
        delete msg.includeUnsafeCount
        let info = CliqzAttrack.getCurrentTabBlockingInfo();
        msg.unsafe_count = info.cookies.blocked + info.requests.unsafe;
      }
      msg.type = 'antitracking';
      utils.telemetry(msg);
      */
    }
  }

};
