import { URLInfo } from 'antitracking/url';

import { log } from 'adblocker/utils';
import parseList, { parseJSResource
                  , serializeFilter
                  , deserializeFilter } from 'adblocker/filters-parsing';
import { matchNetworkFilter
       , matchCosmeticFilter } from 'adblocker/filters-matching';

const TLDs = {"gw": "cc", "gu": "cc", "gt": "cc", "gs": "cc", "gr": "cc", "gq": "cc", "gp": "cc", "dance": "na", "tienda": "na", "gy": "cc", "gg": "cc", "gf": "cc", "ge": "cc", "gd": "cc", "gb": "cc", "ga": "cc", "edu": "na", "gn": "cc", "gm": "cc", "gl": "cc", "\u516c\u53f8": "na", "gi": "cc", "gh": "cc", "tz": "cc", "zone": "na", "tv": "cc", "tw": "cc", "tt": "cc", "immobilien": "na", "tr": "cc", "tp": "cc", "tn": "cc", "to": "cc", "tl": "cc", "bike": "na", "tj": "cc", "tk": "cc", "th": "cc", "tf": "cc", "tg": "cc", "td": "cc", "tc": "cc", "coop": "na", "\u043e\u043d\u043b\u0430\u0439\u043d": "na", "cool": "na", "ro": "cc", "vu": "cc", "democrat": "na", "guitars": "na", "qpon": "na", "\u0441\u0440\u0431": "cc", "zm": "cc", "tel": "na", "futbol": "na", "za": "cc", "\u0628\u0627\u0632\u0627\u0631": "na", "\u0440\u0444": "cc", "zw": "cc", "blue": "na", "mu": "cc", "\u0e44\u0e17\u0e22": "cc", "asia": "na", "marketing": "na", "\u6d4b\u8bd5": "na", "international": "na", "net": "na", "\u65b0\u52a0\u5761": "cc", "okinawa": "na", "\u0baa\u0bb0\u0bbf\u0b9f\u0bcd\u0b9a\u0bc8": "na", "\u05d8\u05e2\u05e1\u05d8": "na", "\uc0bc\uc131": "na", "sexy": "na", "institute": "na", "\u53f0\u7063": "cc", "pics": "na", "\u516c\u76ca": "na", "\u673a\u6784": "na", "social": "na", "domains": "na", "\u9999\u6e2f": "cc", "\u96c6\u56e2": "na", "limo": "na", "\u043c\u043e\u043d": "cc", "tools": "na", "nagoya": "na", "properties": "na", "camera": "na", "today": "na", "club": "na", "company": "na", "glass": "na", "berlin": "na", "me": "cc", "md": "cc", "mg": "cc", "mf": "cc", "ma": "cc", "mc": "cc", "tokyo": "na", "mm": "cc", "ml": "cc", "mo": "cc", "mn": "cc", "mh": "cc", "mk": "cc", "cat": "na", "reviews": "na", "mt": "cc", "mw": "cc", "mv": "cc", "mq": "cc", "mp": "cc", "ms": "cc", "mr": "cc", "cab": "na", "my": "cc", "mx": "cc", "mz": "cc", "\u0b87\u0bb2\u0b99\u0bcd\u0b95\u0bc8": "cc", "wang": "na", "estate": "na", "clothing": "na", "monash": "na", "guru": "na", "technology": "na", "travel": "na", "\u30c6\u30b9\u30c8": "na", "pink": "na", "fr": "cc", "\ud14c\uc2a4\ud2b8": "na", "farm": "na", "lighting": "na", "fi": "cc", "fj": "cc", "fk": "cc", "fm": "cc", "fo": "cc", "sz": "cc", "kaufen": "na", "sx": "cc", "ss": "cc", "sr": "cc", "sv": "cc", "su": "cc", "st": "cc", "sk": "cc", "sj": "cc", "si": "cc", "sh": "cc", "so": "cc", "sn": "cc", "sm": "cc", "sl": "cc", "sc": "cc", "sb": "cc", "rentals": "na", "sg": "cc", "se": "cc", "sd": "cc", "\u7ec4\u7ec7\u673a\u6784": "na", "shoes": "na", "\u4e2d\u570b": "cc", "industries": "na", "lb": "cc", "lc": "cc", "la": "cc", "lk": "cc", "li": "cc", "lv": "cc", "lt": "cc", "lu": "cc", "lr": "cc", "ls": "cc", "holiday": "na", "ly": "cc", "coffee": "na", "ceo": "na", "\u5728\u7ebf": "na", "ye": "cc", "\u0625\u062e\u062a\u0628\u0627\u0631": "na", "ninja": "na", "yt": "cc", "name": "na", "moda": "na", "eh": "cc", "\u0628\u06be\u0627\u0631\u062a": "cc", "ee": "cc", "house": "na", "eg": "cc", "ec": "cc", "vote": "na", "eu": "cc", "et": "cc", "es": "cc", "er": "cc", "ru": "cc", "rw": "cc", "\u0aad\u0abe\u0ab0\u0aa4": "cc", "rs": "cc", "boutique": "na", "re": "cc", "\u0633\u0648\u0631\u064a\u0629": "cc", "gov": "na", "\u043e\u0440\u0433": "na", "red": "na", "foundation": "na", "pub": "na", "vacations": "na", "org": "na", "training": "na", "recipes": "na", "\u0438\u0441\u043f\u044b\u0442\u0430\u043d\u0438\u0435": "na", "\u4e2d\u6587\u7f51": "na", "support": "na", "onl": "na", "\u4e2d\u4fe1": "na", "voto": "na", "florist": "na", "\u0dbd\u0d82\u0d9a\u0dcf": "cc", "\u049b\u0430\u0437": "cc", "management": "na", "\u0645\u0635\u0631": "cc", "\u0622\u0632\u0645\u0627\u06cc\u0634\u06cc": "na", "kiwi": "na", "academy": "na", "sy": "cc", "cards": "na", "\u0938\u0902\u0917\u0920\u0928": "na", "pro": "na", "kred": "na", "sa": "cc", "mil": "na", "\u6211\u7231\u4f60": "na", "agency": "na", "\u307f\u3093\u306a": "na", "equipment": "na", "mango": "na", "luxury": "na", "villas": "na", "\u653f\u52a1": "na", "singles": "na", "systems": "na", "plumbing": "na", "\u03b4\u03bf\u03ba\u03b9\u03bc\u03ae": "na", "\u062a\u0648\u0646\u0633": "cc", "\u067e\u0627\u06a9\u0633\u062a\u0627\u0646": "cc", "gallery": "na", "kg": "cc", "ke": "cc", "\u09ac\u09be\u0982\u09b2\u09be": "cc", "ki": "cc", "kh": "cc", "kn": "cc", "km": "cc", "kr": "cc", "kp": "cc", "kw": "cc", "link": "na", "ky": "cc", "voting": "na", "cruises": "na", "\u0639\u0645\u0627\u0646": "cc", "cheap": "na", "solutions": "na", "\u6e2c\u8a66": "na", "neustar": "na", "partners": "na", "\u0b87\u0ba8\u0bcd\u0ba4\u0bbf\u0baf\u0bbe": "cc", "menu": "na", "arpa": "na", "flights": "na", "rich": "na", "do": "cc", "dm": "cc", "dj": "cc", "dk": "cc", "photography": "na", "de": "cc", "watch": "na", "dz": "cc", "supplies": "na", "report": "na", "tips": "na", "\u10d2\u10d4": "cc", "bar": "na", "qa": "cc", "shiksha": "na", "\u0443\u043a\u0440": "cc", "vision": "na", "wiki": "na", "\u0642\u0637\u0631": "cc", "\ud55c\uad6d": "cc", "computer": "na", "best": "na", "voyage": "na", "expert": "na", "diamonds": "na", "email": "na", "wf": "cc", "jobs": "na", "bargains": "na", "\u79fb\u52a8": "na", "jp": "cc", "jm": "cc", "jo": "cc", "ws": "cc", "je": "cc", "kitchen": "na", "\u0a2d\u0a3e\u0a30\u0a24": "cc", "\u0627\u06cc\u0631\u0627\u0646": "cc", "ua": "cc", "buzz": "na", "com": "na", "uno": "na", "ck": "cc", "ci": "cc", "ch": "cc", "co": "cc", "cn": "cc", "cm": "cc", "cl": "cc", "cc": "cc", "ca": "cc", "cg": "cc", "cf": "cc", "community": "na", "cd": "cc", "cz": "cc", "cy": "cc", "cx": "cc", "cr": "cc", "cw": "cc", "cv": "cc", "cu": "cc", "pr": "cc", "ps": "cc", "pw": "cc", "pt": "cc", "holdings": "na", "wien": "na", "py": "cc", "ai": "cc", "pa": "cc", "pf": "cc", "pg": "cc", "pe": "cc", "pk": "cc", "ph": "cc", "pn": "cc", "pl": "cc", "pm": "cc", "\u53f0\u6e7e": "cc", "aero": "na", "catering": "na", "photos": "na", "\u092a\u0930\u0940\u0915\u094d\u0937\u093e": "na", "graphics": "na", "\u0641\u0644\u0633\u0637\u064a\u0646": "cc", "\u09ad\u09be\u09b0\u09a4": "cc", "ventures": "na", "va": "cc", "vc": "cc", "ve": "cc", "vg": "cc", "iq": "cc", "vi": "cc", "is": "cc", "ir": "cc", "it": "cc", "vn": "cc", "im": "cc", "il": "cc", "io": "cc", "in": "cc", "ie": "cc", "id": "cc", "tattoo": "na", "education": "na", "parts": "na", "events": "na", "\u0c2d\u0c3e\u0c30\u0c24\u0c4d": "cc", "cleaning": "na", "kim": "na", "contractors": "na", "mobi": "na", "center": "na", "photo": "na", "nf": "cc", "\u0645\u0644\u064a\u0633\u064a\u0627": "cc", "wed": "na", "supply": "na", "\u7f51\u7edc": "na", "\u0441\u0430\u0439\u0442": "na", "careers": "na", "build": "na", "\u0627\u0644\u0627\u0631\u062f\u0646": "cc", "bid": "na", "biz": "na", "\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629": "cc", "gift": "na", "\u0434\u0435\u0442\u0438": "na", "works": "na", "\u6e38\u620f": "na", "tm": "cc", "exposed": "na", "productions": "na", "koeln": "na", "dating": "na", "christmas": "na", "bd": "cc", "be": "cc", "bf": "cc", "bg": "cc", "ba": "cc", "bb": "cc", "bl": "cc", "bm": "cc", "bn": "cc", "bo": "cc", "bh": "cc", "bi": "cc", "bj": "cc", "bt": "cc", "bv": "cc", "bw": "cc", "bq": "cc", "br": "cc", "bs": "cc", "post": "na", "by": "cc", "bz": "cc", "om": "cc", "ruhr": "na", "\u0627\u0645\u0627\u0631\u0627\u062a": "cc", "repair": "na", "xyz": "na", "\u0634\u0628\u0643\u0629": "na", "viajes": "na", "museum": "na", "fish": "na", "\u0627\u0644\u062c\u0632\u0627\u0626\u0631": "cc", "hr": "cc", "ht": "cc", "hu": "cc", "hk": "cc", "construction": "na", "hn": "cc", "solar": "na", "hm": "cc", "info": "na", "\u0b9a\u0bbf\u0b99\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0bc2\u0bb0\u0bcd": "cc", "uy": "cc", "uz": "cc", "us": "cc", "um": "cc", "uk": "cc", "ug": "cc", "builders": "na", "ac": "cc", "camp": "na", "ae": "cc", "ad": "cc", "ag": "cc", "af": "cc", "int": "na", "am": "cc", "al": "cc", "ao": "cc", "an": "cc", "aq": "cc", "as": "cc", "ar": "cc", "au": "cc", "at": "cc", "aw": "cc", "ax": "cc", "az": "cc", "ni": "cc", "codes": "na", "nl": "cc", "no": "cc", "na": "cc", "nc": "cc", "ne": "cc", "actor": "na", "ng": "cc", "\u092d\u093e\u0930\u0924": "cc", "nz": "cc", "\u0633\u0648\u062f\u0627\u0646": "cc", "np": "cc", "nr": "cc", "nu": "cc", "xxx": "na", "\u4e16\u754c": "na", "kz": "cc", "enterprises": "na", "land": "na", "\u0627\u0644\u0645\u063a\u0631\u0628": "cc", "\u4e2d\u56fd": "cc", "directory": "na"};

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
  const index = Object.create(null);
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
  Object.keys(index).forEach((key) => {
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
        if (matchNetworkFilter(filter, request)) {
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
      const result = this.matchList(request, bucket, checkedFilters);
      if (result !== null) {
        return result;
      }
    }

    log(`INDEX ${this.name} ${this.miscFilters.length} remaining filters checked`);

    // If no match found, check regexes
    return this.matchList(request, this.miscFilters, checkedFilters);
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

    let inserted = false;
    if (filter.hostname !== null) {
      inserted = this.hostnameAnchors.set(filter.hostname, filter);
    }

    if (!inserted) {
      this.filters.push(filter);
    }
  }

  matchWithDomain(request, domain, checkedFilters) {
    const buckets = this.hostnameAnchors.getFromKey(domain);
    for (const bucket of buckets) {
      if (bucket !== undefined) {
        log(`${this.name} bucket try to match hostnameAnchors (${domain}/${bucket.name})`);
        const result = bucket.match(request, checkedFilters);
        if (result !== null) {
          return result;
        }
      }
    }

    return null;
  }

  match(request, checkedFilters) {
    if (checkedFilters === undefined) {
      checkedFilters = new Set();
    }

    let result = this.matchWithDomain(request, request.hostname, checkedFilters);
    if (result === null) {
      // Try to find a match with remaining filters
      log(`${this.name} bucket try to match misc`);
      result = this.filters.match(request, checkedFilters);
    }

    return result;
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
    let result = null;
    if (bucket !== undefined) {
      log(`Source domain dispatch ${request.sourceGD} size ${bucket.length}`);
      result = bucket.match(request, checkedFilters);
    }

    if (result === null) {
      log(`Source domain dispatch misc size ${this.miscFilters.length}`);
      result = this.miscFilters.match(request, checkedFilters);
    }

    return result;
  }
}


function serializeSourceDomainDispatch(sdd) {
  const sourceDomainDispatch = Object.create(null);
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
    const rules = [...this.miscFilters.filter(filter => matchCosmeticFilter(filter, hostname))];
    const uniqIds = new Set();

    nodeInfo.forEach(node => {
      // [id, tagName, className] = node
      node.forEach(token => {
        this.index.getFromKey(token).forEach(bucket => {
          bucket.forEach(rule => {
            if (!uniqIds.has(rule.id) && matchCosmeticFilter(rule, hostname)) {
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
  constructor(filters) {
    this.size = 0;

    this.miscFilters = new CosmeticBucket('misc');
    this.cosmetics = new FuzzyIndex(
      (hostname, cb) => {
        tokenizeHostname(hostname).forEach(cb);
      },
      token => new CosmeticBucket(`${token}_cosmetics`)
    );

    if (filters) {
      filters.forEach(filter => this.push(filter));
    }
  }

  get length() {
    return this.size;
  }

  push(filter) {
    let inserted = false;
    this.size += 1;

    if (filter.hostnames.length > 0) {
      filter.hostnames.forEach(hostname => {
        inserted = this.cosmetics.set(hostname, filter) || inserted;
      });
    }

    if (!inserted) {
      this.miscFilters.push(filter);
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
          if (!uniqIds.has(rule.id)) {
          // check if one of the preceeding rules has the same selector
            let selectorMatched = rules.find(r => r.unhide !== rule.unhide && r.selector === rule.selector);
            if (!selectorMatched) {
              // if not then check if it should be added to the rules
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
            } else {
              // otherwise, then this implies that the two rules negating each others and should be removed
              rules.splice(rules.indexOf(selectorMatched), 1);
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
 * [ Importants ]    [ Exceptions ] [ Redirect ] [ Remaining filters ]
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
    // $redirect
    this.redirect = new FilterSourceDomainDispatch('redirect');
    // All other filters
    this.filters = new FilterSourceDomainDispatch('filters');

    // ***************** //
    // Cosmetic filters  //
    // ***************** //

    this.cosmetics = new CosmeticEngine();

    // injections
    this.js = new Map();
    this.resources = new Map();
  }

  hasList(asset, checksum) {
    if (this.lists.has(asset)) {
      return this.lists.get(asset).checksum === checksum;
    }
    return false;
  }

  onUpdateResource(updates) {
    updates.forEach((resource) => {
      const { filters, checksum } = resource;

      // NOTE: Here we can only handle one resource file at a time.
      this.resourceChecksum = checksum;
      const typeToResource = parseJSResource(filters);

      // the resource containing javascirpts to be injected
      if (typeToResource.has('application/javascript')) {
        this.js = typeToResource.get('application/javascript');
      }

      // Create a mapping from resource name to { contentType, data }
      // used for request redirection.
      typeToResource.forEach((resources, contentType) => {
        resources.forEach((data, name) => {
          this.resources.set(name, {
            contentType,
            data,
          });
        });
      });
    });
  }

  onUpdateFilters(lists) {
    // Mark the engine as updated, so that it will be serialized on disk
    if (lists.length > 0) {
      this.updated = true;
    }

    // Check if one of the list is an update to an existing list
    let update = false;
    lists.forEach((list) => {
      const { asset } = list;
      if (this.lists.has(asset)) {
        update = true;
      }
    });

    // Parse all filters and update `this.lists`
    lists.forEach((list) => {
      const { asset, filters, checksum } = list;

      // Network filters
      const miscFilters = [];
      const exceptions = [];
      const importants = [];
      const redirect = [];

      // Parse and dispatch filters depending on type
      const parsed = parseList(filters);

      // Cosmetic filters
      const cosmetics = parsed.cosmeticFilters;

      parsed.networkFilters.forEach((filter) => {
        if (filter.isException) {
          exceptions.push(filter);
        } else if (filter.isImportant) {
          importants.push(filter);
        } else if (filter.redirect !== null && filter.redirect !== undefined) {
          redirect.push(filter);
        } else {
          miscFilters.push(filter);
        }
      });

      this.lists.set(asset, {
        checksum,
        filters: miscFilters,
        exceptions,
        importants,
        redirect,
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
        redirect: [],
        cosmetics: [],
      };

      let newSize = 0;
      this.lists.forEach((list) => {
        Object.keys(list)
          .filter(key => list[key] instanceof Array)
          .forEach((key) => {
            list[key].forEach((filter) => {
              newSize += 1;
              allFilters[key].push(filter);
            });
          });
      });

      this.size = newSize;
      this.filters = new FilterSourceDomainDispatch('filters', allFilters.filters);
      this.exceptions = new FilterSourceDomainDispatch('exceptions', allFilters.exceptions);
      this.importants = new FilterSourceDomainDispatch('importants', allFilters.importants);
      this.redirect = new FilterSourceDomainDispatch('redirect', allFilters.redirect);
      this.cosmetics = new CosmeticEngine(allFilters.cosmetics);
    } else {
      // If it's not an update, just add new lists in engine.
      lists.forEach((list) => {
        const { asset } = list;
        const { filters
              , exceptions
              , importants
              , redirect
              , cosmetics } = this.lists.get(asset);

        this.size += (filters.length +
                      exceptions.length +
                      redirect.length +
                      importants.length +
                      cosmetics.length);

        filters.forEach(this.filters.push.bind(this.filters));
        exceptions.forEach(this.exceptions.push.bind(this.exceptions));
        importants.forEach(this.importants.push.bind(this.importants));
        redirect.forEach(this.redirect.push.bind(this.redirect));
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
    let result = null;

    // Check the filters in the following order:
    // 1. redirection ($redirect=resource)
    // 2. $important (not subject to exceptions)
    // 3. normal filters
    // 4. exceptions
    result = this.redirect.match(request, checkedFilters);
    if (result === null) {
      result = this.importants.match(request, checkedFilters);
      if (result === null) {
        result = this.filters.match(request, checkedFilters);
        if (result !== null) {
          if (this.exceptions.match(request, checkedFilters)) {
            result = null;
          }
        }
      }
    }

    log(`Total filters ${checkedFilters.size}`);
    if (result !== null) {
      if (result.redirect !== null) {
        const { data, contentType } = this.resources.get(result.redirect);
        let dataUrl;
        if (contentType.includes(';')) {
          dataUrl = `data:${contentType},${data}`;
        } else {
          dataUrl = `data:${contentType};base64,${btoa(data)}`;
        }

        return {
          match: true,
          redirect: dataUrl.trim(),
        };
      }
      return { match: true };
    }

    return { match: false };
  }
}


function checkEngineRec(serialized, validFilterIds) {
  Object.keys(serialized)
    .filter(key => key !== 'size')
    .forEach((key) => {
      const value = serialized[key];
      if (typeof value === 'number') {
        if (validFilterIds[value] === undefined) {
          throw new Error(`Filter ${serialized} was not found in serialized engine`);
        }
      } else if (typeof value === 'object') {
        checkEngineRec(value, validFilterIds);
      }
    });
}


function serializedEngineSanityCheck(serialized) {
  const { cosmetics
        , filtersIndex
        , exceptions
        , importants
        , redirect
        , filters } = serialized;

  [cosmetics, exceptions, importants, redirect, filters].forEach((bucket) => {
    checkEngineRec(bucket, filtersIndex);
  });
}


export function serializeFiltersEngine(engine, checkEngine = false) {
  // Create a global index of filters to avoid redundancy
  // From `engine.lists` create a mapping: uid => filter
  const filters = Object.create(null);
  engine.lists.forEach((entry) => {
    Object.keys(entry)
      .filter(key => entry[key] instanceof Array)
      .forEach((key) => {
        entry[key].forEach((filter) => {
          filters[filter.id] = serializeFilter(filter);
        });
      });
  });

  // Serialize `engine.lists` but replacing each filter by its uid
  const lists = Object.create(null);
  engine.lists.forEach((entry, asset) => {
    lists[asset] = { checksum: entry.checksum };
    Object.keys(entry)
      .filter(key => entry[key] instanceof Array)
      .forEach((key) => {
        lists[asset][key] = entry[key].map(filter => filter.id);
      });
  });


  const serializedEngine = {
    cosmetics: serializeCosmeticEngine(engine.cosmetics),
    filtersIndex: filters,
    size: engine.size,
    lists,
    exceptions: serializeSourceDomainDispatch(engine.exceptions),
    importants: serializeSourceDomainDispatch(engine.importants),
    redirect: serializeSourceDomainDispatch(engine.redirect),
    filters: serializeSourceDomainDispatch(engine.filters),
  };

  if (checkEngine) {
    serializedEngineSanityCheck(serializedEngine);
  }

  return serializedEngine;
}


export function deserializeFiltersEngine(engine, serialized, checkEngine = false) {
  if (checkEngine) {
    serializedEngineSanityCheck(serialized);
  }

  const { cosmetics
        , filtersIndex
        , size
        , lists
        , exceptions
        , importants
        , redirect
        , filters } = serialized;

  // Deserialize filters index
  const filtersReverseIndex = Object.create(null);
  Object.keys(filtersIndex).forEach((id) => {
    filtersReverseIndex[id] = deserializeFilter(filtersIndex[id]);
  });

  // Deserialize engine.lists
  Object.keys(lists).forEach((asset) => {
    const entry = lists[asset];
    Object.keys(entry)
      .filter(key => entry[key] instanceof Array)
      .forEach((key) => {
        entry[key] = entry[key].map(id => filtersReverseIndex[id]);
      });
    engine.lists.set(asset, entry);
  });

  // Deserialize cosmetic engine and filters
  deserializeCosmeticEngine(engine.cosmetics, cosmetics, filtersReverseIndex);
  engine.exceptions = deserializeSourceDomainDispatch(exceptions, filtersReverseIndex);
  engine.importants = deserializeSourceDomainDispatch(importants, filtersReverseIndex);
  engine.redirect = deserializeSourceDomainDispatch(redirect, filtersReverseIndex);
  engine.filters = deserializeSourceDomainDispatch(filters, filtersReverseIndex);
  engine.size = size;
}
