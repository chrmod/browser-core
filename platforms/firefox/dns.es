import { utils } from 'core/cliqz';

const dnsService = Components.classes["@mozilla.org/network/dns-service;1"]
  .createInstance(Components.interfaces.nsIDNSService);

const dns = {
  // TODO: make it timeout after 40ms or so
  lookup(hostName) {
    try {
      dnsService.resolve(hostName, 0);
      return true;
    } catch (e) {
      return false;
    }
  }
}

export default dns;
Cu.import("resource://gre/modules/Services.jsm");
