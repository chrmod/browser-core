import console from 'core/console';

var eTLDService = Components.classes["@mozilla.org/network/effective-tld-service;1"]
                  .getService(Components.interfaces.nsIEffectiveTLDService);

export function getGeneralDomain(hostname) {
  return eTLDService.getBaseDomainFromHost(hostname);
}
