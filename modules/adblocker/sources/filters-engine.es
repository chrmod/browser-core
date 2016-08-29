import { TLDs } from 'antitracking/domain';
import { URLInfo } from 'antitracking/url';

import { log } from 'adblocker/utils';
import parseList, { parseJSResource } from 'adblocker/filters-parsing';
import match from 'adblocker/filters-matching';


function tokenizeHostname(hostname) {
  const tokens = [];

  hostname.split('.')
    .filter(token => !TLDs[token] && token)
    .filter(token => token !== 'www')
    .forEach(token => {
      token.split('-').forEach(t => {
        log(`TOKEN ${hostname} => ${t}`);
        tokens.push(t);
      });
    });

  return tokens;
}


export function tokenizeURL(pattern) {
  // Deal with big URLs
  if (pattern.length > 150) {
    log(`SHORTEN URL ${pattern}`);
    let newPattern = pattern;
    pattern.split(/[|?=/&]/g).forEach(sub => {
      log(`SUB ${sub} (${sub.length})`);
      if (sub.length > 100) {
        newPattern = newPattern.replace(sub, '');
      }
    });

    pattern = newPattern;
    log(`RES ${pattern}`);
  }

  // Generate tokens (ngrams)
  const NGRAM_SIZE = 6;
  const tokens = [];
  for (let i = 0; i <= (pattern.length - NGRAM_SIZE); ++i) {
    tokens.push(pattern.substring(i, i + NGRAM_SIZE));
  }
  return tokens;
}


class FuzzyIndex {
  constructor(tokenizer, buildBucket) {
    // Define tokenizer
    this.tokenizer = tokenizer;
    if (this.tokenizer === undefined) {
      this.tokenizer = (key, cb) => {
        tokenizeURL(key).forEach(cb);
      };
    }

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
      inserted = true;
      const bucket = this.index.get(token);
      if (bucket === undefined) {
        const newBucket = this.buildBucket(token);
        newBucket.push(value);
        this.index.set(token, newBucket);
      } else {
        bucket.push(value);
      }
    };

    this.tokenizer(key, insertValue);

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
    this.index = new FuzzyIndex(this.tokenizer);

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
class FilterBucket {

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

  push(filter) {
    log(`PUSH ${filter.rawLine}`);
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

  match(request) {
    // Keep track of filters we already tried
    const checkedFilters = new Set();

    if (this.matchWithDomain(request, request.hostname, checkedFilters)) {
      return true;
    }

    // Try to find a match with remaining filters
    log(`${this.name} bucket try to match misc`);
    const result = this.filters.match(request, checkedFilters);
    log(`BUCKET ${this.name} total filters ${checkedFilters.size}`);

    return result;
  }
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

  push(filter) {
    ++this.size;
    const inserted = this.index.set(filter.selector, filter);

    if (!inserted) {
      log(`${this.name} MISC FILTER ${filter.rawLine}`);
      this.miscFilters.push(filter);
    }
  }

  getMatchingRules(nodeInfo) {
    const rules = [...this.miscFilters];

    nodeInfo.forEach(node => {
      // [id, tagName, className] = node
      node.forEach(token => {
        this.index.getFromKey(token).forEach(bucket => {
          bucket.forEach(rule => { rules.push(rule); });
        });
      });
    });

    return rules;
  }
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
    const rules = [];
    const hostname = URLInfo.get(url).hostname;
    log(`getMatchingRules ${url} => ${hostname} (${JSON.stringify(nodeInfo)})`);

    // Check misc bucket
    this.miscFilters.getMatchingRules(nodeInfo).forEach(rule => {
      if (!uniqIds.has(rule.id)) {
        log(`Found rule ${JSON.stringify(rule)}`);
        uniqIds.add(rule.id);
        rules.push(rule);
      }
    });

    // Check hostname buckets
    this.cosmetics.getFromKey(hostname).forEach(bucket => {
      log(`Found bucket ${bucket.size}`);
      bucket.getMatchingRules(nodeInfo).forEach(rule => {
        if (!rule.scriptInject && !uniqIds.has(rule.id)) {
          log(`Found rule ${JSON.stringify(rule)}`);
          uniqIds.add(rule.id);
          rules.push(rule);
        }
      });
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
          if (!uniqIds.has(rule.id)) {
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


/* Manage a list of filters and match them in an efficient way.
 * To avoid inspecting to many filters for each request, we create
 * the following accelerating structure:
 *
 * [ Importants ]    [ Exceptions ]    [ Remaining filters ]
 *
 * Each of theses is a `FilterBucket`, which manage a subset of filters.
 *
 * Importants filters are not subject to exceptions, hence we try it first.
 * If no important filter matched, try to use the remaining filters bucket.
 * If we have a match, try to find an exception.
 */
export default class {
  constructor() {
    this.lists = new Map();
    this.size = 0;

    // *************** //
    // Network filters //
    // *************** //

    // @@filter
    this.exceptions = new FilterBucket('exceptions');
    // $important
    this.importants = new FilterBucket('importants');
    // All other filters
    this.filters = new FilterBucket('filters');

    // ***************** //
    // Cosmetic filters  //
    // ***************** //

    this.cosmetics = new CosmeticEngine();

    // injections
    this.js = new Map();
  }

  onUpdateResource(asset, data) {
    // the resource containing javascirpts to be injected
    const js = parseJSResource(data).get('application/javascript');
    // TODO: handle other type
    if (js) {
      this.js = js;
    }
  }

  onUpdateFilters(asset, newFilters) {
    // Network filters
    const filters = [];
    const exceptions = [];
    const importants = [];

    // Cosmetic filters
    const cosmetics = [];

    // Parse and dispatch filters depending on type
    const parsed = parseList(newFilters);

    parsed.networkFilters.forEach(filter => {
      if (filter.isException) {
        exceptions.push(filter);
      } else if (filter.isImportant) {
        importants.push(filter);
      } else {
        filters.push(filter);
      }
    });

    parsed.cosmeticFilters.forEach(filter => {
      cosmetics.push(filter);
    });

    if (!this.lists.has(asset)) {
      log(`FILTER ENGINE ${asset} UPDATE`);
      // Update data structures
      this.size += filters.length + exceptions.length + importants.length + cosmetics.length;
      filters.forEach(this.filters.push.bind(this.filters));
      exceptions.forEach(this.exceptions.push.bind(this.exceptions));
      importants.forEach(this.importants.push.bind(this.importants));
      cosmetics.forEach(this.cosmetics.push.bind(this.cosmetics));

      this.lists.set(asset, { filters, exceptions, importants, cosmetics });
    } else {
      log(`FILTER ENGINE ${asset} REBUILD`);
      // Rebuild everything
      for (const list of this.lists.values()) {
        list.filters.forEach(filters.push.bind(filters));
        list.exceptions.forEach(exceptions.push.bind(exceptions));
        list.importants.forEach(importants.push.bind(importants));
        list.cosmetics.forEach(cosmetics.push.bind(cosmetics));
      }

      this.size = filters.length + exceptions.length + importants.length + cosmetics.length;
      this.filters = new FilterBucket('filters', filters);
      this.exceptions = new FilterBucket('exceptions', exceptions);
      this.importants = new FilterBucket('importants', importants);
      this.cosmetics = new CosmeticEngine(cosmetics);
    }

    log(`Filter engine updated with ${filters.length} filters, ` +
        `${exceptions.length} exceptions, ` +
        `${importants.length} importants and ${cosmetics.length} cosmetic filters\n`);
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
    if (this.importants.match(request)) {
      log('IMPORTANT');
      return true;
    } else if (this.filters.match(request)) {
      log('FILTER');
      if (this.exceptions.match(request)) {
        log('EXCEPTION');
        return false;
      }

      return true;
    }

    return false;
  }
}
