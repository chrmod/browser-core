import * as psl from 'platform/public-suffix-list';
// Functions for manipulating domain names

export function getGeneralDomain(domain) {
  try {
    return psl.getGeneralDomain(domain);
  } catch(e) {
    return '';
  }
}

export function sameGeneralDomain(dom1, dom2) {
  // getGeneralDomain may throw an exception if domain is invalid
  try {
    return psl.getGeneralDomain(dom1) === psl.getGeneralDomain(dom2);
  } catch(e) {
    return false;
  }
};
