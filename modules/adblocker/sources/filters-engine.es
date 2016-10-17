import { TLDs } from 'antitracking/domain';
import { URLInfo } from 'antitracking/url';

import { log } from 'adblocker/utils';
import parseList, { parseJSResource
                  , serializeFilter
                  , deserializeFilter } from 'adblocker/filters-parsing';
import match from 'adblocker/filters-matching';


const TOKEN_BLACKLIST = new Set([
  'com',
  'http',
  'https',
  'icon',
  'images',
  'img',
  'js',
  'net',
  'news',
  'www',
]);


function tokenizeHostname(hostname) {
  return hostname.split('.')
    .filter(token => (token &&
                      !TLDs[token] &&
                      !TOKEN_BLACKLIST.has(token)));
}


export function tokenizeURL(pattern) {
  return pattern.match(/[a-zA-Z0-9]+/g) || [];
}


class FuzzyIndex {
  constructor(tokenizer, buildBucket, indexOnlyOne) {
    // Define tokenizer
    this.tokenizer = tokenizer;
    if (this.tokenizer === undefined) {
      this.tokenizer = (key, cb) => {
        tokenizeURL(key).forEach(cb);
      };
    }

    // Should we index with all tokens, or just one
    this.indexOnlyOne = indexOnlyOne;

    // Function used to create a new bucket
    this.buildBucket = buildBucket;
    if (this.buildBucket === undefined) {
      this.buildBucket = () => [];
    }

    // {token -> list of values}
    this.index = new Map();
    this.size = 0;
  }

  get length() {
    return this.size;
  }

  set(key, value) {
    // Only true if we insert something (we have at least 1 token)
    log(`SET ${key}`);
    let inserted = false;
    const insertValue = token => {
      log(`FOUND TOKEN ${token}`);
      if (!(this.indexOnlyOne && inserted)) {
        inserted = true;
        const bucket = this.index.get(token);
        if (bucket === undefined) {
          const newBucket = this.buildBucket(token);
          newBucket.push(value);
          this.index.set(token, newBucket);
        } else {
          bucket.push(value);
        }
      }
    };

    // Split tokens into good, common, tld
    // common: too common tokens
    // tld: corresponding to hostname extensions
    // good: anything else
    // TODO: What about trying to insert bigger tokens first?
    const goodTokens = [];
    const commonTokens = [];
    const tldTokens = [];
    this.tokenizer(key, token => {
      if (TOKEN_BLACKLIST.has(token)) {
        commonTokens.push(token);
      } else if (TLDs[token]) {
        tldTokens.push(token);
      } else {
        goodTokens.push(token);
      }
    });

    // Try to insert
    goodTokens.forEach(insertValue);
    if (!inserted) {
      tldTokens.forEach(insertValue);
    }
    if (!inserted) {
      commonTokens.forEach(insertValue);
    }

    if (inserted) {
      this.size += 1;
    }

    return inserted;
  }

  getFromKey(key) {
    const buckets = [];
    this.tokenizer(key, token => {
      const bucket = this.index.get(token);
      if (bucket !== undefined) {
        log(`BUCKET ${token} size ${bucket.length}`);
        buckets.push(bucket);
      }
    });
    return buckets;
  }

  getFromTokens(tokens) {
    const buckets = [];
    tokens.forEach(token => {
      const bucket = this.index.get(token);
      if (bucket !== undefined) {
        log(`BUCKET ${token} size ${bucket.length}`);
        buckets.push(bucket);
      }
    });
    return buckets;
  }
}


function serializeFuzzyIndex(fi, serializeBucket) {
  const index = {};
  fi.index.forEach((value, key) => {
    index[key] = serializeBucket(value);
  });

  return {
    index,
    indexOnlyOne: fi.indexOnlyOne,
    size: fi.size,
  };
}


function deserializeFuzzyIndex(fi, serialized, deserializeBucket) {
  const { index, indexOnlyOne, size } = serialized;
  Object.keys(index).forEach(key => {
    const value = index[key];
    fi.index.set(key, deserializeBucket(value));
  });

  fi.size = size;
  fi.indexOnlyOne = indexOnlyOne;
}


/* A filter reverse index is the lowest level of optimization we apply on filter
 * matching. To avoid inspecting filters that have no chance of matching, we
 * dispatch them in an index { ngram -> list of filter }.
 *
 * When we need to know if there is a match for an URL, we extract ngrams from it
 * and find all the buckets for which filters contains at list one of the ngram of
 * the URL. We then stop at the first match.
 */
class FilterReverseIndex {
  constructor(name, filters) {
    // Name of this index (for debugging purpose)
    this.name = name;

    // Remaining filters not stored in the index
    this.miscFilters = [];
    this.size = 0;

    // Tokenizer used on patterns for fuzzy matching
    this.tokenizer = (pattern, cb) => {
      pattern.split(/[*^]/g).forEach(part => {
        tokenizeURL(part).forEach(cb);
      });
    };
    this.index = new FuzzyIndex(this.tokenizer, undefined, true);

    // Update index
    if (filters) {
      filters.forEach(this.push.bind(this));
    }
  }

  get length() {
    return this.size;
  }

  push(filter) {
    log(`REVERSE INDEX ${this.name} INSERT ${filter.rawLine}`);
    ++this.size;
    const inserted = this.index.set(filter.filterStr, filter);

    if (!inserted) {
      log(`${this.name} MISC FILTER ${filter.rawLine}`);
      this.miscFilters.push(filter);
    }
  }

  matchList(request, list, checkedFilters) {
    for (let i = 0; i < list.length; i++) {
      const filter = list[i];
      if (!checkedFilters.has(filter.id)) {
        checkedFilters.add(filter.id);
        if (match(filter, request)) {
          log(`INDEX ${this.name} MATCH ${filter.rawLine} ~= ${request.url}`);
          return filter;
        }
      }
    }
    return null;
  }

  match(request, checkedFilters) {
    // Keep track of filters checked
    if (checkedFilters === undefined) {
      checkedFilters = new Set();
    }

    const buckets = this.index.getFromTokens(request.tokens);

    for (const bucket of buckets) {
      log(`INDEX ${this.name} BUCKET => ${bucket.length}`);
      if (this.matchList(request, bucket, checkedFilters) !== null) {
        return true;
      }
    }

    log(`INDEX ${this.name} ${this.miscFilters.length} remaining filters checked`);

    // If no match found, check regexes
    return this.matchList(request, this.miscFilters, checkedFilters) !== null;
  }
}


function serializeFilterReverseIndex(fri) {
  return {
    name: fri.name,
    size: fri.size,
    miscFilters: fri.miscFilters.map(filter => filter.id),
    index: serializeFuzzyIndex(fri.index, bucket => bucket.map(filter => filter.id)),
  };
}


function deserializeFilterReverseIndex(serialized, filtersIndex) {
  const { name, size, miscFilters, index } = serialized;
  const fri = new FilterReverseIndex(name);
  fri.size = size;
  fri.miscFilters = miscFilters.map(id => filtersIndex[id]);
  deserializeFuzzyIndex(fri.index, index, bucket => bucket.map(id => filtersIndex[id]));
  return fri;
}


/* A Bucket manages a subsets of all the filters. To avoid matching too many
 * useless filters, there is a second level of dispatch here.
 *
 * [ hostname anchors (||filter) ]    [ remaining filters ]
 *
 * The first structure map { domain -> filters that apply only on domain }
 * as the `hostname anchors` only apply on a specific domain name.
 *
 * Each group of filters is stored in a Filter index that is the last level
 * of dispatch of our matching engine.
 */
class FilterHostnameDispatch {

  constructor(name, filters) {
    // TODO: Dispatch also on:
    // - fromImage
    // - fromMedia
    // - fromObject
    // - fromObjectSubrequest
    // - fromOther
    // - fromPing
    // - fromScript
    // - fromStylesheet
    // - fromXmlHttpRequest
    // To avoid matching filter if request type doesn't match
    // If we do it, we could simplify the match function of Filter

    this.name = name;
    this.size = 0;

    // ||hostname filter
    this.hostnameAnchors = new FuzzyIndex(
      // Tokenize key
      (hostname, cb) => {
        tokenizeHostname(hostname).forEach(cb);
      },
      // Create a new empty bucket
      token => new FilterReverseIndex(`${token}_${name}`)
    );

    // All other filters
    this.filters = new FilterReverseIndex(this.name);

    // Dispatch filters
    if (filters !== undefined) {
      filters.forEach(this.push.bind(this));
    }

    log(`${name} CREATE BUCKET: ${this.filters.length} filters +` +
        `${this.hostnameAnchors.size} hostnames`);
  }

  get length() {
    return this.size;
  }

  push(filter) {
    ++this.size;

    if (filter.hostname !== null) {
      this.hostnameAnchors.set(filter.hostname, filter);
    } else {
      this.filters.push(filter);
    }
  }

  matchWithDomain(request, domain, checkedFilters) {
    const buckets = this.hostnameAnchors.getFromKey(domain);
    for (const bucket of buckets) {
      if (bucket !== undefined) {
        log(`${this.name} bucket try to match hostnameAnchors (${domain}/${bucket.name})`);
        if (bucket.match(request, checkedFilters)) {
          return true;
        }
      }
    }

    return false;
  }

  match(request, checkedFilters) {
    if (checkedFilters === undefined) {
      checkedFilters = new Set();
    }

    if (this.matchWithDomain(request, request.hostname, checkedFilters)) {
      return true;
    }

    // Try to find a match with remaining filters
    log(`${this.name} bucket try to match misc`);
    return this.filters.match(request, checkedFilters);
  }
}


function serializeFilterHostnameDispatch(fhd) {
  return {
    name: fhd.name,
    size: fhd.size,
    hostnameAnchors: serializeFuzzyIndex(fhd.hostnameAnchors, bucket =>
      serializeFilterReverseIndex(bucket)
    ),
    filters: serializeFilterReverseIndex(fhd.filters),
  };
}


function deserializeFilterHostnameDispatch(serialized, filtersIndex) {
  const { name, size, hostnameAnchors, filters } = serialized;
  const fhd = new FilterHostnameDispatch(name);
  fhd.size = size;
  fhd.filters = deserializeFilterReverseIndex(filters, filtersIndex);
  deserializeFuzzyIndex(fhd.hostnameAnchors, hostnameAnchors, bucket =>
    deserializeFilterReverseIndex(bucket, filtersIndex)
  );
  return fhd;
}


class FilterSourceDomainDispatch {
  constructor(name, filters) {
    this.name = name;
    this.size = 0;

    // Dispatch on source domain
    this.sourceDomainDispatch = new Map();
    // Filters without source domain specified
    this.miscFilters = new FilterHostnameDispatch(this.name);

    if (filters) {
      filters.forEach(this.push.bind(this));
    }
  }

  get length() {
    return this.size;
  }

  push(filter) {
    ++this.size;

    if (filter.optNotDomains === null &&
        filter.optDomains !== null) {
      filter.optDomains.forEach(domain => {
        log(`SOURCE DOMAIN DISPATCH ${domain} filter: ${filter.rawLine}`);
        const bucket = this.sourceDomainDispatch.get(domain);
        if (bucket === undefined) {
          const newIndex = new FilterHostnameDispatch(`${this.name}_${domain}`);
          newIndex.push(filter);
          this.sourceDomainDispatch.set(domain, newIndex);
        } else {
          bucket.push(filter);
        }
      });
    } else {
      this.miscFilters.push(filter);
    }
  }

  match(request, checkedFilters) {
    // Check bucket for source domain
    const bucket = this.sourceDomainDispatch.get(request.sourceGD);
    let foundMatch = false;
    if (bucket !== undefined) {
      log(`Source domain dispatch ${request.sourceGD} size ${bucket.length}`);
      foundMatch = bucket.match(request, checkedFilters);
    }

    if (!foundMatch) {
      log(`Source domain dispatch misc size ${this.miscFilters.length}`);
      foundMatch = this.miscFilters.match(request, checkedFilters);
    }

    return foundMatch;
  }
}


function serializeSourceDomainDispatch(sdd) {
  const sourceDomainDispatch = {};
  sdd.sourceDomainDispatch.forEach((value, key) => {
    sourceDomainDispatch[key] = serializeFilterHostnameDispatch(value);
  });

  return {
    sourceDomainDispatch,
    miscFilters: serializeFilterHostnameDispatch(sdd.miscFilters),
    name: sdd.name,
    size: sdd.size,
  };
}


function deserializeSourceDomainDispatch(serialized, filtersIndex) {
  const { sourceDomainDispatch, miscFilters, name, size } = serialized;
  const sdd = new FilterSourceDomainDispatch(name);

  sdd.size = size;
  sdd.miscFilters = deserializeFilterHostnameDispatch(miscFilters, filtersIndex);
  Object.keys(sourceDomainDispatch).forEach(key => {
    const value = sourceDomainDispatch[key];
    sdd.sourceDomainDispatch.set(key, deserializeFilterHostnameDispatch(value, filtersIndex));
  });

  return sdd;
}


/**
 * Dispatch cosmetics filters on selectors
 */
class CosmeticBucket {
  constructor(name, filters) {
    this.name = name;
    this.size = 0;

    this.miscFilters = [];
    this.index = new FuzzyIndex(
      (selector, cb) => {
        selector.split(/[^#.\w_-]/g).filter(token => token.length > 0).forEach(cb);
      }
    );

    if (filters) {
      filters.forEach(this.push.bind(this));
    }
  }

  get length() {
    return this.size;
  }

  push(filter) {
    ++this.size;
    const inserted = this.index.set(filter.selector, filter);

    if (!inserted) {
      this.miscFilters.push(filter);
    }
  }

  /**
   * Return element hiding rules and exception rules
   * @param {string} hostname - domain of the page.
   * @param {Array} nodeInfo - Array of tuples [id, tagName, className].
  **/
  getMatchingRules(hostname, nodeInfo) {
    const rules = [...this.miscFilters];
    const uniqIds = new Set();

    nodeInfo.forEach(node => {
      // [id, tagName, className] = node
      node.forEach(token => {
        this.index.getFromKey(token).forEach(bucket => {
          bucket.forEach(rule => {
            if (!uniqIds.has(rule.id)) {
              rules.push(rule);
              uniqIds.add(rule.id);
            }
          });
        });
      });
    });

    const matchingRules = {};
    function addRule(rule, matchingHost, exception) {
      if (rule.selector in matchingRules) {
        const oldMatchingHost = matchingRules[rule.selector].matchingHost;
        if (matchingHost.length > oldMatchingHost.length) {
          matchingRules[rule.selector] = {
            rule,
            exception,
            matchingHost,
          };
        }
      } else {
        matchingRules[rule.selector] = {
          rule,
          exception,
          matchingHost,
        };
      }
    }

    // filter by hostname
    if (hostname !== '') {
      rules.forEach(rule => {
        rule.hostnames.forEach(h => {
          let exception = false;
          if (h.startsWith('~')) {
            exception = true;
            h = h.substr(1);
          }
          if (rule.unhide) {
            exception = true;
          }
          if (hostname === h || hostname.endsWith(`.${h}`)) {
            addRule(rule, h, exception);
          }
        });
      });
    } else {  // miscFilters
      rules.forEach(rule => {
        addRule(rule, '', false);
      });
    }

    return matchingRules;
  }
}


function serializeCosmeticBucket(cb) {
  return {
    name: cb.name,
    size: cb.size,
    miscFilters: cb.miscFilters.map(filter => filter.id),
    index: serializeFuzzyIndex(cb.index, bucket => bucket.map(filter => filter.id)),
  };
}


function deserializeCosmeticBucket(serialized, filtersIndex) {
  const { name, size, miscFilters, index } = serialized;
  const cb = new CosmeticBucket(name);
  cb.size = size;
  cb.miscFilters = miscFilters.map(id => filtersIndex[id]);
  deserializeFuzzyIndex(cb.index, index, bucket => bucket.map(id => filtersIndex[id]));
  return cb;
}


class CosmeticEngine {
  constructor() {
    this.size = 0;

    this.miscFilters = new CosmeticBucket('misc');
    this.cosmetics = new FuzzyIndex(
      (hostname, cb) => {
        tokenizeHostname(hostname).forEach(cb);
      },
      token => new CosmeticBucket(`${token}_cosmetics`)
    );
  }

  get length() {
    return this.size;
  }

  push(filter) {
    if (filter.hostnames.length === 0) {
      this.miscFilters.push(filter);
    } else {
      filter.hostnames.forEach(hostname => {
        this.cosmetics.set(hostname, filter);
      });
    }
  }

  /**
   * Return a list of potential cosmetics filters
   *
   * @param {string} url - url of the page.
   * @param {Array} nodeInfo - Array of tuples [id, tagName, className].
  **/
  getMatchingRules(url, nodeInfo) {
    const uniqIds = new Set();
    const miscRules = {};
    const rules = [];
    let hostname = URLInfo.get(url).hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substr(4);
    }
    log(`getMatchingRules ${url} => ${hostname} (${JSON.stringify(nodeInfo)})`);

    // Check misc bucket
    const miscMatchingRules = this.miscFilters.getMatchingRules('', nodeInfo);

    // Check hostname buckets
    this.cosmetics.getFromKey(hostname).forEach(bucket => {
      log(`Found bucket ${bucket.size}`);
      const matchingRules = bucket.getMatchingRules(hostname, nodeInfo);
      Object.keys(matchingRules).forEach(selector => {
        const r = matchingRules[selector];
        if (!r.exception && !uniqIds.has(r.rule.id)) {
          rules.push(r.rule);
          uniqIds.add(r.rule.id);
        } else if (selector in miscMatchingRules) {  // handle exception rules
          delete miscMatchingRules[selector];
        }
      });
    });

    Object.keys(miscMatchingRules).forEach(selector => {
      rules.push(miscMatchingRules[selector].rule);
    });

    log(`COSMETICS found ${rules.length} potential rules for ${url}`);
    return rules;
  }

  /**
   * Return all the cosmetic filters on a domain
   *
   * @param {string} url - url of the page
  **/
  getDomainRules(url, js) {
    const hostname = URLInfo.get(url).hostname;
    const rules = [];
    const uniqIds = new Set();
    log(`getDomainRules ${url} => ${hostname}`);
    this.cosmetics.getFromKey(hostname).forEach(bucket => {
      for (const value of bucket.index.index.values()) {
        value.forEach(rule => {
          if (!uniqIds.has(rule.id) && !rule.unhide) {
            if (rule.scriptInject) {
              // make sure the selector was replaced by javascript
              if (!rule.scriptReplaced) {
                rule.selector = js.get(rule.selector);
                rule.scriptReplaced = true;
              }
            }
            if (rule.selector) {
              rules.push(rule);
              uniqIds.add(rule.id);
            }
          }
        });
      }
    });
    return rules;
  }
}


function serializeCosmeticEngine(cosmetics) {
  return {
    size: cosmetics.size,
    miscFilters: serializeCosmeticBucket(cosmetics.miscFilters),
    cosmetics: serializeFuzzyIndex(cosmetics.cosmetics, serializeCosmeticBucket),
  };
}


function deserializeCosmeticEngine(engine, serialized, filtersIndex) {
  const { size, miscFilters, cosmetics } = serialized;
  engine.size = size;
  engine.miscFilters = deserializeCosmeticBucket(miscFilters, filtersIndex);
  deserializeFuzzyIndex(engine.cosmetics, cosmetics, bucket =>
    deserializeCosmeticBucket(bucket, filtersIndex)
  );
}


/* Manage a list of filters and match them in an efficient way.
 * To avoid inspecting to many filters for each request, we create
 * the following accelerating structure:
 *
 * [ Importants ]    [ Exceptions ]    [ Remaining filters ]
 *
 * Each of theses is a `FilterHostnameDispatch`, which manage a subset of filters.
 *
 * Importants filters are not subject to exceptions, hence we try it first.
 * If no important filter matched, try to use the remaining filters bucket.
 * If we have a match, try to find an exception.
 */
export default class {
  constructor() {
    this.lists = new Map();
    this.resourceChecksum = null;

    this.size = 0;
    this.updated = false;

    // *************** //
    // Network filters //
    // *************** //

    // @@filter
    this.exceptions = new FilterSourceDomainDispatch('exceptions');
    // $important
    this.importants = new FilterSourceDomainDispatch('importants');
    // All other filters
    this.filters = new FilterSourceDomainDispatch('filters');

    // ***************** //
    // Cosmetic filters  //
    // ***************** //

    this.cosmetics = new CosmeticEngine();

    // injections
    this.js = new Map();
  }

  hasList(asset, checksum) {
    if (this.lists.has(asset)) {
      return this.lists.get(asset).checksum === checksum;
    }
    return false;
  }

  onUpdateResource(resources) {
    resources.forEach(resource => {
      const { filters, checksum } = resource;

      // NOTE: Here we can only handle one resource at a time.
      this.resourceChecksum = checksum;

      // the resource containing javascirpts to be injected
      const js = parseJSResource(filters).get('application/javascript');
      // TODO: handle other type
      if (js) {
        this.js = js;
      }
    });
  }

  onUpdateFilters(lists) {
    // Mark the engine as updated, so that it will be serialized on disk
    if (lists.length > 0) {
      this.updated = true;
    }

    // Check if one of the list is an update to an existing list
    let update = false;
    lists.forEach(list => {
      const { asset } = list;
      if (this.lists.has(asset)) {
        update = true;
      }
    });

    // Parse all filters and update `this.lists`
    lists.forEach(list => {
      const { asset, filters, checksum } = list;

      // Network filters
      const miscFilters = [];
      const exceptions = [];
      const importants = [];

      // Parse and dispatch filters depending on type
      const parsed = parseList(filters);

      // Cosmetic filters
      const cosmetics = parsed.cosmeticFilters;

      parsed.networkFilters.forEach(filter => {
        if (filter.isException) {
          exceptions.push(filter);
        } else if (filter.isImportant) {
          importants.push(filter);
        } else {
          miscFilters.push(filter);
        }
      });

      this.lists.set(asset, {
        checksum,
        filters: miscFilters,
        exceptions,
        importants,
        cosmetics,
      });
    });


    // Update the engine with new rules

    if (update) {
      // If it's an update then recreate the whole engine
      const allFilters = {
        filters: [],
        exceptions: [],
        importants: [],
        cosmetics: [],
      };

      this.lists.forEach(list => {
        ['filters', 'exceptions', 'importants', 'cosmetics'].forEach(listName => {
          list[listName].forEach(filter => {
            allFilters[listName].push(filter);
          });
        });
      });

      this.size = (allFilters.filters.length +
                   allFilters.exceptions.length +
                   allFilters.importants.length +
                   allFilters.cosmetics.length);

      this.filters = new FilterSourceDomainDispatch('filters', allFilters.filters);
      this.exceptions = new FilterSourceDomainDispatch('exceptions', allFilters.exceptions);
      this.importants = new FilterSourceDomainDispatch('importants', allFilters.importants);
      this.cosmetics = new CosmeticEngine(allFilters.cosmetics);
    } else {
      // If it's not an update, just update existing engine
      lists.forEach(list => {
        const { asset } = list;
        const { filters, exceptions, importants, cosmetics } = this.lists.get(asset);
        // If this is the first time we add this list => update data structures
        this.size += filters.length + exceptions.length + importants.length + cosmetics.length;
        filters.forEach(this.filters.push.bind(this.filters));
        exceptions.forEach(this.exceptions.push.bind(this.exceptions));
        importants.forEach(this.importants.push.bind(this.importants));
        cosmetics.forEach(this.cosmetics.push.bind(this.cosmetics));
      });
    }
  }

  getCosmeticsFilters(url, nodes) {
    return this.cosmetics.getMatchingRules(url, nodes);
  }

  getDomainFilters(url) {
    return this.cosmetics.getDomainRules(url, this.js);
  }

  match(request) {
    log(`MATCH ${JSON.stringify(request)}`);
    request.tokens = tokenizeURL(request.url);

    const checkedFilters = new Set();
    let result = false;

    if (this.importants.match(request, checkedFilters)) {
      log('IMPORTANT');
      result = true;
    } else if (this.filters.match(request, checkedFilters)) {
      log('FILTER');
      if (this.exceptions.match(request, checkedFilters)) {
        log('EXCEPTION');
        result = false;
      } else {
        result = true;
      }
    }

    log(`Total filters ${checkedFilters.size}`);
    return result;
  }
}


export function serializeFiltersEngine(engine) {
  // Serialize `engine.js`
  const js = {};
  engine.js.forEach((value, key) => {
    js[key] = value;
  });

  // Create a global index of filters to avoid redundancy
  const filters = {};
  engine.lists.forEach(value => {
    ['filters', 'exceptions', 'importants', 'cosmetics'].forEach(key => {
      value[key].forEach(filter => {
        filters[filter.id] = serializeFilter(filter);
      });
    });
  });

  // Serialize `engine.lists`
  const lists = {};
  engine.lists.forEach((value, key) => {
    const entry = { checksum: value.checksum };
    ['filters', 'exceptions', 'importants', 'cosmetics'].forEach(listName => {
      entry[listName] = value[listName].map(filter => filter.id);
    });
    lists[key] = entry;
  });

  return {
    resourceChecksum: engine.resourceChecksum,
    cosmetics: serializeCosmeticEngine(engine.cosmetics),
    js,
    filtersIndex: filters,
    size: engine.size,
    lists,
    exceptions: serializeSourceDomainDispatch(engine.exceptions),
    importants: serializeSourceDomainDispatch(engine.importants),
    filters: serializeSourceDomainDispatch(engine.filters),
  };
}


export function deserializeFiltersEngine(engine, serialized) {
  const { resourceChecksum
        , cosmetics
        , js
        , filtersIndex
        , size
        , lists
        , exceptions
        , importants
        , filters } = serialized;

  engine.size = size;
  engine.resourceChecksum = resourceChecksum;

  // Deserialize filters
  const filtersReverseIndex = {};
  Object.keys(filtersIndex).forEach(id => {
    const serializedFilter = filtersIndex[id];
    filtersReverseIndex[id] = deserializeFilter(serializedFilter);
  });

  // Deserialize cosmetic engine
  deserializeCosmeticEngine(engine.cosmetics, cosmetics, filtersReverseIndex);

  // Deserialize engine.js
  Object.keys(js).forEach(key => {
    const value = js[key];
    engine.js.set(key, value);
  });

  // Deserialize engine.lists
  Object.keys(lists).forEach(asset => {
    const entry = lists[asset];
    log(`DESERIALIZE ASSET ${asset} ${entry.checksum}`);
    ['filters', 'exceptions', 'importants', 'cosmetics'].forEach(listName => {
      log(`DESERIALIZE ASSET ${asset}->${listName}`);
      const serializedList = entry[listName];
      log(`DESERIALIZE LEN ${serializedList.length}`);
      log(`DESERIALIZE LEN ${JSON.stringify(serializedList)}`);
      entry[listName] = serializedList.map(id => filtersReverseIndex[id]);
    });
    engine.lists.set(asset, entry);
  });

  // Deserialize SourceDomainDispatch: exceptions, importants, filters
  engine.exceptions = deserializeSourceDomainDispatch(exceptions, filtersReverseIndex);
  engine.importants = deserializeSourceDomainDispatch(importants, filtersReverseIndex);
  engine.filters = deserializeSourceDomainDispatch(filters, filtersReverseIndex);
}
