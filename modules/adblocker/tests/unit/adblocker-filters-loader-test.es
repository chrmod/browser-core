/* global chai */
/* global describeModule */
/* global require */


const fs = require('fs');



function readFile(path) {
  return fs.readFileSync(path, 'utf8');
}


let isMobile;
let isFirefox;
let isChromium;
let platformName;


function allListsLoaded(listsToLoad, loadedLists) {
  for (let elt of listsToLoad) {
    if (!loadedLists.has(elt)) {
      return false;
    }
  }
  return true;
}


function platformSpecificLoadingTest(listsToLoad, FilterLoader) {
  const filtersLoader = new FilterLoader();
  const loadedLists = new Set();

  return new Promise(function (resolve, reject) {
    filtersLoader.onUpdate(update => {
      const { asset, filters, isFiltersList } = update;
      console.log(`ON UPDATE ${asset}`);
      loadedLists.add(asset);

      if (allListsLoaded(listsToLoad, loadedLists)) {
        resolve();
      }
    });

    filtersLoader.load();
  });
}


export default describeModule('adblocker/filters-loader',
  () => ({
    'platform/language': { 
      default: {
        state() { return []; }
      } 
    },
    'core/fs': {
      readFile: function () { return Promise.reject(); },
      writeFile: function () { return Promise.resolve(); },
      mkdir: function () { return Promise.resolve(); }
    },
    'adblocker/utils': {
      log: function (msg) {
        console.log( `[adblocker] ${msg}`);
      }
    },
    'core/cliqz': {
      utils: {
        setInterval: function () {},
        getPref: function (pref, defaultValue) {
          return defaultValue;
        },
        setPref: function () {},
        httpGet: function (url, callback, reject) {
          console.log('FETCH URL ' + url);
          let content = "";
          switch (url) {
            case "https://cdn.cliqz.com/adblocking/undefined/allowed-lists.json":
              if (isMobile) {
                content = readFile('modules/adblocker/tests/unit/data/allowed-lists-mobile.json');
              } else {
                content = readFile('modules/adblocker/tests/unit/data/allowed-lists.json');
              }
              break;
            case "https://cdn.cliqz.com/adblocking/undefined/allowed-lists.json":
              content = readFile('modules/adblocker/tests/unit/data/allowed-lists.json');
              break;
            default:
              break;
          };
          console.log(`READ FILE ${content.length}`)
          callback({response: content});
        }
      }
    },
    'core/platform': {
      default: {
        platformName
      }, 
    },
  }),
  function () {
    describe('Test loading filters', function () {
      let FilterLoader;

      beforeEach(function importFiltersLoader() {
        FilterLoader = this.module().default;
      });

      it('does not load mobile customized filters', function () {
        isChromium = false;
        isFirefox = false;
        isMobile = true;
        platformName = 'mobile';

        return platformSpecificLoadingTest(new Set([
          "https://easylist-downloads.adblockplus.org/antiadblockfilters.txt",
          "https://raw.githubusercontent.com/reek/anti-adblock-killer/master/anti-adblock-killer-filters.txt",
          "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resources.txt",
          "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt",
          "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt",
          "https://s3.amazonaws.com/cdn.cliqz.com/adblocking/customized_filters_mobile_specific.txt",
          "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/thirdparties/easylist-downloads.adblockplus.org/easylist.txt"
        ]), FilterLoader); 
      });

      it('does not load firefox filters', function () {
        isChromium = false;
        isFirefox = true;
        isMobile = false;
        platformName = 'firefox';

        return platformSpecificLoadingTest(new Set([
          "https://easylist-downloads.adblockplus.org/antiadblockfilters.txt",
          "https://raw.githubusercontent.com/reek/anti-adblock-killer/master/anti-adblock-killer-filters.txt",
          "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resources.txt",
          "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt",
          "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt",
          "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/thirdparties/easylist-downloads.adblockplus.org/easylist.txt"
        ]), FilterLoader);
      }); 
    });
  }
);
