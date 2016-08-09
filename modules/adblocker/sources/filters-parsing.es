import { log } from 'adblocker/utils';


// Uniq ID generator
let uidGen = 0;


// TODO: Options not supported yet:
// redirect
// popup
// popunder
// generichide
// genericblock

// TODO: Lot of hostname anchors are of the form hostname[...]*[...]
//       we could split it into prefix + plain pattern
// TODO: Make sure we support difference between adblock and ublock when filter is a valid hostname
// TODO: Replace some of the attributes by a bitmask
export class AdFilter {
  constructor(line) {
    // Assign an id to the filter
    this.id = uidGen++;

    this.rawLine = line.trim();
    this.filterStr = this.rawLine;
    this.supported = true;
    this.isException = false;
    this.rawOptions = null;
    this.hostname = null;

    this.regex = null;

    // Options
    // null  == not specified
    // true  == value true
    // false == negation (~)
    this.optDomains = null;
    this.optNotDomains = null;

    this.isImportant = false;
    this.matchCase = false;

    this.thirdParty = null;
    this.firstParty = null;

    // Options on origin policy
    this.fromAny = true;
    this.fromImage = null;
    this.fromMedia = null;
    this.fromObject = null;
    this.fromObjectSubrequest = null;
    this.fromOther = null;
    this.fromPing = null;
    this.fromScript = null;
    this.fromStylesheet = null;
    this.fromSubdocument = null;
    this.fromXmlHttpRequest = null;

    // Kind of pattern
    this.isHostname = false;
    this.isPlain = false;
    this.isRegex = false;
    this.isLeftAnchor = false;
    this.isRightAnchor = false;
    this.isHostnameAnchor = false;

    // Deal with comments
    this.isComment = (this.filterStr.startsWith('!') ||
                      this.filterStr.startsWith('#') ||
                      this.filterStr.startsWith('[Adblock'));

    // Trim comments at the end of the line
    // eg: "... # Comment"
    this.filterStr = this.filterStr.replace(/[\s]#.*$/, '');

    if (!this.isComment) {
      // domains##selector || domains###selector || domains#@#selector
      if (this.filterStr.includes('##') || this.filterStr.includes('#@#')) {
        this.supported = false;
      } else {
        // @@filter == Exception
        this.isException = this.filterStr.startsWith('@@');
        if (this.isException) {
          this.filterStr = this.filterStr.substring(2);
        }

        // filter$options == Options
        if (this.filterStr.includes('$')) {
          const filterAndOptions = this.filterStr.split('$');
          this.filterStr = filterAndOptions[0];
          this.rawOptions = filterAndOptions[1];
          // Parse options and set flags
          this.parseOptions(this.rawOptions);
        }

        if (this.supported) {
          // Identify kind of pattern

          // Deal with hostname pattern
          if (this.filterStr.startsWith('127.0.0.1')) {
            this.hostname = this.filterStr.split(' ').pop();
            this.filterStr = '';
            this.isHostname = true;
            this.isPlain = true;
            this.isRegex = false;
            this.isHostnameAnchor = true;
          } else {
            if (this.filterStr.endsWith('|')) {
              this.isRightAnchor = true;
              this.filterStr = this.filterStr.substring(0, this.filterStr.length - 1);
            }

            if (this.filterStr.startsWith('||')) {
              this.isHostnameAnchor = true;
              this.filterStr = this.filterStr.substring(2);
            } else if (this.filterStr.startsWith('|')) {
              this.isLeftAnchor = true;
              this.filterStr = this.filterStr.substring(1);
            }

            // If pattern ends with "*", strip it as it often can be
            // transformed into a "plain pattern" this way.
            if (this.filterStr.endsWith('*') && this.filterStr.length > 1) {
              this.filterStr = this.filterStr.substring(0, this.filterStr.length - 1);
            }

            // Is regex?
            if (this.filterStr.includes('*') || this.filterStr.includes('^')) {
              this.isRegex = true;
            } else {
              this.isPlain = true;
            }

            // Extract hostname to match it more easily
            // NOTE: This is the most common case of filters
            if (this.isPlain && this.isHostnameAnchor) {
              // Look for next /
              const slashIndex = this.filterStr.indexOf('/');
              if (slashIndex !== -1) {
                this.hostname = this.filterStr.substring(0, slashIndex);
                this.filterStr = this.filterStr.substring(slashIndex);
              } else {
                this.hostname = this.filterStr;
                this.filterStr = '';
              }
            } else if (this.isRegex && this.isHostnameAnchor) {
              try {
                // Split at the first '/' or '^' character to get the hostname
                // and then the pattern.
                const firstSep = this.filterStr.search(/[/^*]/);
                if (firstSep !== -1) {
                  const hostname = this.filterStr.substring(0, firstSep);
                  const pattern = this.filterStr.substring(firstSep);

                  this.hostname = hostname;
                  this.isRegex = (pattern.includes('^') ||
                    pattern.includes('*'));
                  this.isPlain = !this.isRegex;
                  this.filterStr = pattern;

                  if (this.filterStr === '^') {
                    this.filterStr = '';
                    this.isPlain = true;
                    this.isRegex = false;
                  }

                  log(`SPLIT ${JSON.stringify({
                    raw: this.rawLine,
                    hostname: this.hostname,
                    filterStr: this.filterStr,
                    isRegex: this.isRegex,
                  })}`);
                }
              } catch (ex) {
                log(`ERROR !! ${ex}`);
              }
            }
          }

          // Compile Regex
          if (this.isRegex) {
            this.regex = this.compileRegex(this.filterStr);
            this.rawRegex = this.regex.toString();
          } else { // if (!this.matchCase) {
            // NOTE: No filter seems to be using the `match-case` option,
            // hence, it's more efficient to just convert everything to
            // lower case before matching.
            if (this.filterStr) {
              this.filterStr = this.filterStr.toLowerCase();
            }
            if (this.hostname) {
              this.hostname = this.hostname.toLowerCase();
            }
          }
        }
      }
    }
  }

  compileRegex(filterStr) {
    let filter = filterStr;

    // Escape special regex characters: |.$+?{}()[]\
    filter = filter.replace(/([|.$+?{}()[\]\\])/g, '\\$1');

    // * can match anything
    filter = filter.replace(/\*/g, '.*');
    // ^ can match any separator or the end of the pattern
    filter = filter.replace(/\^/g, '(?:[^\\w\\d_.%-]|$)');

    // Should match end of url
    if (this.isRightAnchor) {
      filter = `${filter}$`;
    }

    if (this.isHostnameAnchor || this.isLeftAnchor) {
      filter = `^${filter}`;
    }

    try {
      // Compile regex
      if (this.matchCase) {
        return new RegExp(filter);
      }
      return new RegExp(filter, 'i');
    } catch (ex) {
      log(`failed to compile regex ${filter} with error ${ex}`);
      // Ignore this filter
      this.supported = false;
      return null;
    }
  }

  parseOptions(rawOptions) {
    rawOptions.split(',').forEach(rawOption => {
      let negation = false;
      let option = rawOption;

      // Check for negation: ~option
      if (option.startsWith('~')) {
        negation = true;
        option = option.substring(1);
      } else {
        negation = false;
      }

      // Check for options: option=value1|value2
      let optionValues = [];
      if (option.includes('=')) {
        const optionAndValues = option.split('=', 2);
        option = optionAndValues[0];
        optionValues = optionAndValues[1].split('|');
      }

      switch (option) {
        case 'domain':
          this.optDomains = new Set();
          this.optNotDomains = new Set();

          optionValues.forEach(value => {
            if (value) {
              if (value.startsWith('~')) {
                this.optNotDomains.add(value.substring(1));
              } else {
                this.optDomains.add(value);
              }
            }
          });

          if (this.optDomains.size === 0) {
            this.optDomains = null;
          }
          if (this.optNotDomains.size === 0) {
            this.optNotDomains = null;
          }

          // this.optDomains = [...this.optDomains.values()];
          // this.optNotDomains = [...this.optNotDomains.values()];
          break;
        case 'image':
          this.fromImage = !negation;
          break;
        case 'media':
          this.fromMedia = !negation;
          break;
        case 'object':
          this.fromObject = !negation;
          break;
        case 'object-subrequest':
          this.fromObjectSubrequest = !negation;
          break;
        case 'other':
          this.fromOther = !negation;
          break;
        case 'ping':
          this.fromPing = !negation;
          break;
        case 'script':
          this.fromScript = !negation;
          break;
        case 'stylesheet':
          this.fromStylesheet = !negation;
          break;
        case 'subdocument':
          this.fromSubdocument = !negation;
          break;
        case 'xmlhttprequest':
          this.fromXmlHttpRequest = !negation;
          break;
        case 'important':
          // Note: `negation` should always be `false` here.
          this.isImportant = true;
          break;
        case 'match-case':
          // Note: `negation` should always be `false` here.
          this.matchCase = true;
          break;
        case 'third-party':
          this.thirdParty = !negation;
          break;
        case 'first-party':
          this.firstParty = !negation;
          break;
        case 'collapse':
          break;
        // Disable this filter if any other option is encountered
        default:
          // Disable this filter if we don't support all the options
          this.supported = false;
          log(`NOT SUPPORTED OPTION ${option}`);
      }
    });

    // Check if any of the fromX flag is set
    this.fromAny = (
      this.fromImage === null &&
      this.fromMedia === null &&
      this.fromObject === null &&
      this.fromObjectSubrequest === null &&
      this.fromOther === null &&
      this.fromPing === null &&
      this.fromScript === null &&
      this.fromStylesheet === null &&
      this.fromSubdocument === null &&
      this.fromXmlHttpRequest === null);
  }
}


export default function parseList(list) {
  try {
    const filters = [];
    list.forEach(line => {
      if (line) {
        const filter = new AdFilter(line);
        if (filter.supported && !filter.isComment) {
          log(`compiled ${line} into ${JSON.stringify(filter)}`);
          filters.push(filter);
        }
      }
    });
    return filters;
  } catch (ex) {
    log(`ERROR WHILE PARSING ${typeof list} ${ex}`);
    return null;
  }
}
