import ResourceLoader, { Resource, UpdateCallbackHandler } from 'core/resource-loader';
import CliqzLanguage from 'platform/language';

// Disk persisting
const RESOURCES_PATH = ['antitracking', 'adblocking'];


// Common durations
const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;


// URLs to fetch block lists
const TODAY_DATE = new Date().toISOString().slice(0, 10);

const BASE_URL = `https://cdn.cliqz.com/adblocking/latest-filters/`;

const LANGS = CliqzLanguage.state();

const JS_RESOURCES = new Set([
  // uBlock resource
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resources.txt',
]);

function isJSResource(path) {
  return JS_RESOURCES.has(path);
}


class Checksums extends UpdateCallbackHandler {
  constructor() {
    super();

    this.loader = new ResourceLoader(
      RESOURCES_PATH.concat('checksums'),
      {
        cron: ONE_DAY,
        dataType: 'json',
        remoteURL: this.remoteURL,
      }
    );
    this.loader.onUpdate(this.updateChecksums.bind(this));
  }

  load() {
    this.loader.load().then(this.updateChecksums.bind(this));
  }

  // Private API

  get remoteURL() {
    // The URL should contain a timestamp to avoid caching
    return 'https://cdn.cliqz.com/adblocking/allowed-lists.json';
  }

  updateChecksums(data) {
    // Update the URL as it must include the timestamp to avoid caching
    // NOTE: This mustn't be removed as it would break the update.
    this.loader.resource.remoteURL = this.remoteURL;

    // Parse checksums
    Object.keys(data).forEach(list => {
      Object.keys(data[list]).forEach(asset => {
        const checksum = data[list][asset].checksum;
        let lang = null;
        if (list == 'country_lists'){
          lang = data[list][asset].language;
        }

        let assetName = asset;

        // Strip prefix
        ['http://', 'https://'].forEach(prefix => {
          if (assetName.startsWith(prefix)) {
            assetName = assetName.substring(prefix.length);
          }
        });

        // Trigger callback even if checksum is the same since
        // it wouldn't work for filter-lists.json file which could
        // have the same checksum but lists could be expired.
        // FiltersList class has then to check the checksum before update.
        if (lang === null || LANGS.indexOf(lang) > -1){
          this.triggerCallbacks({
            checksum,
            asset,
            remoteURL: `${BASE_URL}` + assetName,
          });
        }
          
        });
    });
  }
}


// TODO: Download the file everytime, but we should find a way to use the checksum
// Or, since some lists use an expiration date, we could store a timestamp instead of checksum
class FiltersList extends UpdateCallbackHandler {
  constructor(checksum, asset, remoteURL) {
    super();
    this.checksum = checksum;

    let assetName = asset;

    // Strip prefix
    ['http://', 'https://'].forEach(prefix => {
      if (assetName.startsWith(prefix)) {
        assetName = assetName.substring(prefix.length);
      }
    });

    this.resource = new Resource(
      RESOURCES_PATH.concat(assetName.split('/')),
      { remoteURL, dataType: 'plainText' }
    );
    this.resource.onUpdate(this.updateList.bind(this));
  }

  load() {
    this.resource.load().then(this.updateList.bind(this));
  }

  updateFromChecksum(checksum) {
    if (checksum === undefined || checksum !== this.checksum) {
      this.checksum = checksum;
      this.resource.updateFromRemote();
    }
  }

  updateList(data) {
    const filters = data.split(/\r\n|\r|\n/g);
    if (filters.length > 0) {
      this.triggerCallbacks(filters);
    }
  }
}


/* Class responsible for loading, persisting and updating filters lists.
 */
export default class extends UpdateCallbackHandler {

  constructor() {
    super();

    // Current checksums of official filters lists
    this.checksums = new Checksums();


    // Lists of filters currently loaded
    this.lists = new Map();


    // Register callbacks on list creation
    this.checksums.onUpdate(this.updateList.bind(this));
  }

  load() {
    this.checksums.load();
  }

  updateList({ checksum, asset, remoteURL }) {
    let list = this.lists.get(asset);

    if (list === undefined) {
      list = new FiltersList(checksum, asset, remoteURL);
      this.lists.set(asset, list);
      list.onUpdate(filters => {
        const isFiltersList = !isJSResource(asset);
        this.triggerCallbacks({ asset, filters, isFiltersList });
      });
      list.load();
    } else {
      list.updateFromChecksum(checksum);
    }
  }
}
