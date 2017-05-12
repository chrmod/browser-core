import tlds from './lib/tldjs';
import ipaddr from './lib/ipaddr';


// Re-export symbols from `ipaddr`
const isIpv4Address = ipaddr.IPv4.isIPv4.bind(ipaddr.IPv4);
const isIpv6Address = ipaddr.IPv6.isIPv6.bind(ipaddr.IPv6);

// Re-export symbols from `tldjs`
const getDomain = tlds.getDomain.bind(tlds);
const getPublicSuffix = tlds.getPublicSuffix.bind(tlds);
const getSubdomain = tlds.getSubdomain.bind(tlds);
const tldExists = tlds.tldExists.bind(tlds);
const TLDs = tlds.rules;


function getGeneralDomain(url) {
  // If it's a valid IP address, we return it.
  if (ipaddr.isValid(url)) {
    return url;
  }

  return getDomain(url);
}


export default {
  getGeneralDomain,

  // tldjs
  getPublicSuffix,
  getDomain,
  getSubdomain,
  tldExists,
  TLDs,

  // ipaddr
  isIpv4Address,
  isIpv6Address,
};
