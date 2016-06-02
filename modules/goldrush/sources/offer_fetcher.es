import { utils } from 'core/cliqz';

// var assert = require('assert');

function log(s){
  utils.log(s, 'GOLDRUSH - OFFER_FETCHER');
}


////////////////////////////////////////////////////////////////////////////////
// api function builder
//
var BE_ACTION = {
  GET: 'get',
  MARK_USED: 'mark_used',
  IS_USED: 'is_used',
};

function getQueryString(action, argsNames, argsValues) {
  // assert(argsNames.length === argsValues.length);

  // TODO: better to do some checking here that is formatted properly?
  let result = action;
  for (let i = 0; i < argsNames.length; ++i) {
    result += '|' + String(argsNames[i]) + '=' + String(argsValues[i]);
  }
  return result;
}

////////////////////////////////////////////////////////////////////////////////

//
// @brief this method will parse a bm response and extract the vouchers part from
//        it and format it as we need.
// @param httpResp  The response we get from the httpRequest.
// @return json vouchers part or null on error.
//
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

////////////////////////////////////////////////////////////////////////////////

//
// @brief Creates the offer fetcher with the backend address to where we will
//        fetch and mark coupons as used.
//        [http://mixer-beta.clyqz.com/api/v1/rich-header?path=/map&bmresult=vouchers.cliqz.com&]
// @param backendAddr is the address we will hit to query the coupons.
// @param mappings is the mappings for the clusters and domains (same than python model)
//
export function OfferFetcher(backendAddr, mappings = null) {
  // assert(mappings !== null);
  // assert(mappings['dname_to_did'] !== undefined);
  // assert(mappings['dname_to_cid'] !== undefined);

  this.beAddr = backendAddr;
  this.mappings = mappings;

  // to send something we need to:
  // destURL = backendAddr + q=get_amazon.de
  // destURL = backendAddr + q=set_coupon-ID
}

//
// @brief get a list of available coupons for a particular domain.
// @param domainName  The domain name to check to (without .de or anything)
// @param callback    The callback to be called on success if we could get vouchers
// @returns a list of coupons structure on the callback
//
OfferFetcher.prototype.checkForCouponsByDomain = function(domainName, callback) {
  // assert(this.beAddr.length > 0);
  // assert(this.mappings !== null);

  var result = {};

  // we need first to get the associated cluster and
  let domainID = this.mappings['dname_to_cid'][domainName];
  if (domainID === undefined) {
    log('we cannot get the coupons for a domain that is not registerd: domainName:' + domainName);
    return {};
  }
  let clusterID = this.mappings['dname_to_did'][domainName];

  // it should exists for sure (mappings is wrong if not and cannot happen).
  // assert(clusterID !== undefined && clusterID >= 0);
  let argNames = ['cluster_id', 'domain_id'];
  let argValues = [clusterID, domainID];
  let destURL = this.beAddr + 'q=' + getQueryString(BE_ACTION.GET, argNames, argValues);

  // perform the call and wait for the response
  log('we will hit the endpoint: ' + destURL);

  var vouchers = null;
  utils.httpGet(destURL, function success(resp) {
      vouchers = parseHttpResponse(resp.response);
      log('voucher received: ' + vouchers);

      // TODO: here we need to call a callback here so we can notify that the
      //       results are ready
      if (callback) {
        callback(vouchers);
      }

    }, function error(resp) {
      // TODO: will be gut if we can track this information
      // TODO_QUESTION: how do we can track this information and report it back?
      //                or any error in general?
      log('error getting the coupongs from the backend?');
    }
  );

  log('http request end');
  return vouchers;
};

//
// @brief get a list of available coupons for a cluster
// @param clusterID  The cluster id to check to
// @param callback    The callback to be called on success if we could get vouchers
// @returns a list of coupons structure on the callback
//
OfferFetcher.prototype.checkForCouponsByCluster = function(clusterID, callback) {
  // assert(this.beAddr.length > 0);
  // assert(this.mappings !== null);

  var result = {};

  // it should exists for sure (mappings is wrong if not and cannot happen).
  // assert(clusterID !== undefined && clusterID >= 0);
  let argNames = ['cluster_id'];
  let argValues = [clusterID];
  let destURL = this.beAddr + 'q=' + getQueryString(BE_ACTION.GET, argNames, argValues);

  // perform the call and wait for the response
  log('we will hit the endpoint: ' + destURL);

  var vouchersObj = null;
  utils.httpGet(destURL, function success(resp) {
      vouchersObj = parseHttpResponse(resp.response);
      log('voucher received:');
      log(vouchersObj);

      // TODO: here we need to call a callback here so we can notify that the
      //       results are ready
      if (callback) {
        callback(vouchersObj);
      }

    }, function error(resp) {
      // TODO: will be gut if we can track this information
      // TODO_QUESTION: how do we can track this information and report it back?
      //                or any error in general?
      log('error getting the coupongs from the backend?');
    }
  );

  log('http request end');
};

//
// @brief mark a coupon as used
// @param couponID the coupon we want to mark as used
//
OfferFetcher.prototype.markCouponAsUsed = function(couponID) {
  let argNames = ['coupon_id'];
  let argValues = [couponID];
  let destURL = this.beAddr + 'q=' + getQueryString(BE_ACTION.MARK_USED, argNames, argValues);
  log('marking a coupon as used: ' + destURL);

  var vouchersObj = null;
  utils.httpGet(destURL, function success(resp) {
      vouchersObj = parseHttpResponse(resp.response);
      if (vouchersObj['mark_used'] === true) {
        log('coupon ' + String(couponID) + ' marked as used');
      } else {
        log('coupon ' + String(couponID) + ' was already marked as used');
      }
    }, function error(resp) {
      // TODO: will be gut if we can track this information
      log('error marking a coupon as used: ' + destURL);
    }
  );

};

//
// @brief Check if a coupon is already used or not.
// @param couponID the coupons id to check
// @param callback the callback to be called on success after we check if a coupon
//                 is used or not
// @return true if it used or false otherwise
//
OfferFetcher.prototype.isCouponUsed = function(couponID, callback) {
  let argNames = ['coupon_id'];
  let argValues = [couponID];
  let destURL = this.beAddr + 'q=' + getQueryString(BE_ACTION.IS_USED, argNames, argValues);
  log('checking coupon status: ' + destURL);

  var vouchersObj = null;
  utils.httpGet(destURL, function success(resp) {
    vouchersObj = parseHttpResponse(resp.response);
    callback && callback(vouchersObj['is_used']);
  }, function error(resp) {
      // TODO: will be gut if we can track this information
      log('error checking coupon status:\n' + resp.response);
    }
    );
};



