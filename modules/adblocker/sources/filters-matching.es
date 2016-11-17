import { TLDs } from 'antitracking/domain';


// Some content policy types used in filters
const CPT = {
  TYPE_OTHER: 1,
  TYPE_SCRIPT: 2,
  TYPE_IMAGE: 3,
  TYPE_STYLESHEET: 4,
  TYPE_OBJECT: 5,
  TYPE_SUBDOCUMENT: 7,
  TYPE_PING: 10,
  TYPE_XMLHTTPREQUEST: 11,
  TYPE_OBJECT_SUBREQUEST: 12,
  TYPE_MEDIA: 15,
  TYPE_WEBSOCKET: 16,
};


function checkContentPolicy(filter, cpt) {
  // Check content policy type only if at least one content policy has
  // been specified in the options.
  if (!filter.fromAny) {
    const options = [
      [filter.fromSubdocument, CPT.TYPE_SUBDOCUMENT],
      [filter.fromImage, CPT.TYPE_IMAGE],
      [filter.fromMedia, CPT.TYPE_MEDIA],
      [filter.fromObject, CPT.TYPE_OBJECT],
      [filter.fromObjectSubrequest, CPT.TYPE_OBJECT_SUBREQUEST],
      [filter.fromOther, CPT.TYPE_OTHER],
      [filter.fromPing, CPT.TYPE_PING],
      [filter.fromScript, CPT.TYPE_SCRIPT],
      [filter.fromStylesheet, CPT.TYPE_STYLESHEET],
      [filter.fromWebsocket, CPT.TYPE_WEBSOCKET],
      [filter.fromXmlHttpRequest, CPT.TYPE_XMLHTTPREQUEST],
    ];

    // If content policy type `option` is specified in filter filter,
    // then the policy type of the request must match.
    // - If more than one policy type is valid, we must find at least one
    // - If we found a blacklisted policy type we can return `false`
    let foundValidCP = null;
    for (let i = 0; i < options.length; i++) {
      const [option, policyType] = options[i];

      // Found a fromX matching the origin policy of the request
      if (option === true) {
        if (cpt === policyType) {
          foundValidCP = true;
          break;
        } else {
          foundValidCP = false;
        }
      }

      // This rule can't be used with filter policy type
      if (option === false && cpt === policyType) {
        return false;
      }
    }

    // Couldn't find any policy origin matching the request
    if (foundValidCP === false) {
      return false;
    }
  }

  return true;
}


function checkOptions(filter, request) {
  // Source
  const sHost = request.sourceHostname;
  const sHostGD = request.sourceGD;

  // Url endpoint
  const hostGD = request.hostGD;

  // Check option $third-party
  // source domain and requested domain must be different
  if ((filter.firstParty === false || filter.thirdParty === true) && sHostGD === hostGD) {
    return false;
  }

  // $~third-party
  // source domain and requested domain must be the same
  if ((filter.firstParty === true || filter.thirdParty === false) && sHostGD !== hostGD) {
    return false;
  }

  // URL must be among these domains to match
  if (filter.optDomains !== null &&
     !(filter.optDomains.has(sHostGD) ||
       filter.optDomains.has(sHost))) {
    return false;
  }

  // URL must not be among these domains to match
  if (filter.optNotDomains !== null &&
      (filter.optNotDomains.has(sHostGD) ||
       filter.optNotDomains.has(sHost))) {
    return false;
  }

  if (!checkContentPolicy(filter, request.cpt)) {
    return false;
  }

  return true;
}


function checkPattern(filter, request) {
  const url = request.url;
  const host = request.hostname;

  // Try to match url with pattern
  if (filter.isHostnameAnchor) {
    const matchIndex = host.indexOf(filter.hostname);
    // Either start at beginning of hostname or be preceded by a '.'
    if ((matchIndex > 0 && host[matchIndex - 1] === '.') || matchIndex === 0) {
      // Extract only the part after the hostname
      const urlPattern = url.substring(url.indexOf(filter.hostname) + filter.hostname.length);
      if (filter.isRegex) {
        // If it's a regex, it should match the pattern after hostname
        return filter.regex.test(urlPattern);
      } else if (filter.isRightAnchor) {
        // If it's a right anchor, then the filterStr should match exactly
        return urlPattern === filter.filterStr;
      } else {
        return urlPattern.startsWith(filter.filterStr);
      }
    }
  } else {
    if (filter.isRegex) {
      return filter.regex.test(url);
    } else if (filter.isLeftAnchor && filter.isRightAnchor) {
      return url === filter.filterStr;
    } else if (filter.isLeftAnchor) {
      return url.startsWith(filter.filterStr);
    } else if (filter.isRightAnchor) {
      return url.endsWith(filter.filterStr);
    }

    return url.includes(filter.filterStr);
  }

  return false;
}


export function matchNetworkFilter(filter, request) {
  if (filter.supported) {
    if (!checkOptions(filter, request)) {
      return false;
    }

    return checkPattern(filter, request);
  }

  return false;
}


/* Checks that hostnamePattern matches at the end of the hostname.
 * Partial matches are allowed, but hostname should be a valid
 * subdomain of hostnamePattern.
 */
function checkHostnamesPartialMatch(hostname, hostnamePattern) {
  if (hostname.endsWith(hostnamePattern)) {
    const patternIndex = hostname.indexOf(hostnamePattern);
    if (patternIndex === 0 || (patternIndex !== -1 && hostname.charAt(patternIndex - 1) === '.')) {
      return true;
    }
  }

  return false;
}


/* Checks if `hostname` matches `hostnamePattern`, which can appear as
 * a domain selector in a cosmetic filter: hostnamePattern##selector
 *
 * It takes care of the concept of entities introduced by uBlock: google.*
 * https://github.com/gorhill/uBlock/wiki/Static-filter-syntax#entity-based-cosmetic-filters
 */
function matchHostname(hostname, hostnamePattern) {
  const globIndex = hostnamePattern.indexOf('.*');
  if (globIndex === (hostnamePattern.length - 2)) {
    // Match entity:
    const entity = hostnamePattern.substring(0, globIndex);

    // Ignore TLDs suffix
    const parts = hostname.split('.').reverse();
    let i = 0;
    while (i < parts.length && TLDs[parts[i]]) {
      i += 1;
    }

    // Check if we have a match
    if (i < parts.length) {
      return checkHostnamesPartialMatch(parts.splice(i).reverse().join('.'), entity);
    }

    return false;
  }

  return checkHostnamesPartialMatch(hostname, hostnamePattern);
}


function matchHostnames(hostname, hostnames) {
  // TODO: Do we want to return `true` when there is no hostname constraint?
  if (!hostnames) {
    return false;
  }

  for (const hn of hostnames) {
    if (matchHostname(hostname, hn)) {
      return true;
    }
  }

  return false;
}


export function matchCosmeticFilter(filter, hostname) {
  if (filter.supported) {
    if (filter.hostnames && hostname) {
      return matchHostnames(hostname, filter.hostnames);
    }

    return true;
  }

  return false;
}
