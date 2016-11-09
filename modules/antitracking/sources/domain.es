import * as psl from 'platform/public-suffix-list';
// Functions for manipulating domain names

export function getGeneralDomain(domain) {
  try {
    return psl.getGeneralDomain(domain);
  } catch(e) {
    if (isIpAddress(domain)) {
      return domain
    } else {
      return '';
    }
  }
}

export function sameGeneralDomain(dom1, dom2) {
  // getGeneralDomain may throw an exception if domain is invalid
  try {
    return dom1 === dom2 || psl.getGeneralDomain(dom1) === psl.getGeneralDomain(dom2);
  } catch(e) {
    return false;
  }
};

export function isIpAddress(domain) {
  const digits = domain.split('.');
  return digits.length === 4 && digits.map(function(s) {
    return parseInt(s);
  }).every(function(d) {
    return d >= 0 && d < 256;
  });
}
