import { utils } from 'core/cliqz';

function log(s){
  utils.log(s, 'GOLDRUSH');
}

//
// @brief This class will be in charge of handling the offers to the user, will
//        control all the other main modules as well.
//
export function OfferManager(backendAddr) {
  this.beAddr = backendAddr;
  // to send something we need to:
  // destURL = backendAddr + q=get_amazon.de
  // destURL = backendAddr + q=set_coupon-ID
};

//
// @brief get a list of available coupons for a particular domain.
// @param domainName  The domain name to check to (without .de or anything)
// @returns a list of coupons structure (check )
//
OfferManager.prototype.checkForCoupons = function(domainName) {
  // TODO

};

//
// @brief mark a coupon as used
// @param couponID the coupon we want to mark as used
//
OfferManager.prototype.markCouponAsUsed = function(couponID) {
  // TODO
};


