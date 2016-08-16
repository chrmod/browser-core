// Some content policy types used in filters
const TYPE_OTHER = 1;
const TYPE_SCRIPT = 2;
const TYPE_IMAGE = 3;
const TYPE_STYLESHEET = 4;
const TYPE_OBJECT = 5;
const TYPE_SUBDOCUMENT = 7;
const TYPE_PING = 10;
const TYPE_XMLHTTPREQUEST = 11;
const TYPE_OBJECT_SUBREQUEST = 12;
const TYPE_MEDIA = 15;


function checkContentPolicy(filter, cpt) {
  // Check content policy type only if at least one content policy has
  // been specified in the options.
  if (!filter.fromAny) {
    const options = [
      [filter.fromSubdocument, TYPE_SUBDOCUMENT],
      [filter.fromImage, TYPE_IMAGE],
      [filter.fromMedia, TYPE_MEDIA],
      [filter.fromObject, TYPE_OBJECT],
      [filter.fromObjectSubrequest, TYPE_OBJECT_SUBREQUEST],
      [filter.fromOther, TYPE_OTHER],
      [filter.fromPing, TYPE_PING],
      [filter.fromScript, TYPE_SCRIPT],
      [filter.fromStylesheet, TYPE_STYLESHEET],
      [filter.fromXmlHttpRequest, TYPE_XMLHTTPREQUEST],
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
  const hostGD = request.hostGD;

  // Try to match url with pattern
  if (filter.isHostnameAnchor) {
    if (host.startsWith(filter.hostname) ||
        hostGD.startsWith(filter.hostname) ||
        host.endsWith(filter.hostname)) {
      // Extract only the part after the hostname
      const urlPattern = url.substring(url.indexOf(filter.hostname) + filter.hostname.length);
      if (filter.isRegex) {
        return filter.regex.test(urlPattern);
      }
      // TODO: Should startWith instead of includes?
      return urlPattern.startsWith(filter.filterStr);
    }
  } else {
    if (filter.isRegex) {
      return filter.regex.test(url);
    } else if (filter.isLeftAnchor) {
      return url.startsWith(filter.filterStr);
    } else if (filter.isRightAnchor) {
      return url.endsWith(filter.filterStr);
    }

    return url.includes(filter.filterStr);
  }

  return false;
}


export default function match(filter, request) {
  if (filter.supported) {
    if (!checkOptions(filter, request)) {
      return false;
    }

    return checkPattern(filter, request);
  }

  return false;
}