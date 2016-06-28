import { utils } from 'core/cliqz';
import {IntentDetector} from 'goldrush/intent_detector';
import {IntentInput} from 'goldrush/intent_input';
import ResourceLoader from 'core/resource-loader';
import { OfferFetcher } from 'goldrush/offer_fetcher';
import { DateTimeDB } from 'goldrush/dbs/datetime_db';
import { GeneralDB } from 'goldrush/dbs/general_db';
import { DomainInfoDB } from 'goldrush/dbs/domain_info_db';
import { TopHourFID }  from 'goldrush/fids/top_hour_fid';
import { TopClusterVisitsFID } from 'goldrush/fids/top_cluster_visits_fid';
import { SignalDetectedFilterFID } from 'goldrush/fids/signal_detected_filter_fid';
import { UIManager } from 'goldrush/ui/ui_manager';
import { StatsHandler } from 'goldrush/stats_handler';
import GoldrushConfigs from 'goldrush/goldrush_configs';
import LoggingHandler from 'goldrush/logging_handler';

// TODO: review if this is fine
Components.utils.import('resource://gre/modules/Services.jsm');
// needed for the history
Components.utils.import('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');



////////////////////////////////////////////////////////////////////////////////
// Consts
//
const MODULE_NAME = 'offer_manager';

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// TODO: remove this method and the usage of it
function printSet(setName, s) {
  let str = '{';
  s.forEach(v => {
    str += v + ', ';
  });
  str += '}';
  LoggingHandler.info(MODULE_NAME, 'SET ' + setName + ': ' + str);
}

// TODO: remove this and the usage of this method
//
function check(expression, message) {
  if (!expression) {
    LoggingHandler.error(MODULE_NAME, message, LoggingHandler.ERR_INTERNAL);
  }
}

////////////////////////////////////////////////////////////////////////////////

function openNewTabAndSelect(url) {
  var currWindow = CliqzUtils.getWindow();
  var gBrowser = currWindow.gBrowser;
  if (!currWindow || !gBrowser) {
    return false;
  }

  gBrowser.selectedTab = gBrowser.addTab(url);
  return true;
}

////////////////////////////////////////////////////////////////////////////////
function parseMappingsFileAsPromise(filename) {
  return new Promise(function(resolve, reject) {
    let rscLoader = new ResourceLoader(
      [ 'goldrush', filename ],
      {}
    );

    rscLoader.load().then(json => {
      // now we parse the data and return this
      check(json['cid_to_cname'] !== undefined, 'cid_to_cname not defined');
      check(json['cname_to_cid'] !== undefined, 'cname_to_cid not defined');
      check(json['did_to_dname'] !== undefined, 'did_to_dname not defined');
      check(json['dname_to_did'] !== undefined, 'dname_to_did not defined');
      check(json['dname_to_cid'] !== undefined, 'dname_to_cid not defined');

      resolve(json);
    });
  });

}

////////////////////////////////////////////////////////////////////////////////
//
// @brief this method should load all the data of each cluster (the files)
//        to be used later.
//
function getClustersFilesMap() {
  // cluster_name -> {
  //    'domains_file' : filepath,
  //    'db_file' : filepath,
  //    'patterns_file' : filepath,
  //    'rules_file' : filepath,
  // }
  //
  // for now we will hardcode this.
  var result = {};
  return result = {
    'car_parts' : {
      'domains_file' : 'car_parts.cluster',
      'db_file' : 'car_parts.dbinfo',
      'patterns_file' : 'car_parts.patterns',
      'rules_file' : 'car_parts.rules'
    },
    'food_delivery' : {
      'domains_file' : 'food_delivery.cluster',
      'db_file' : 'food_delivery.dbinfo',
      'patterns_file' : 'food_delivery.patterns',
      'rules_file' : 'food_delivery.rules'
    },
    'online_tickets' : {
      'domains_file' : 'online_tickets.cluster',
      'db_file' : 'online_tickets.dbinfo',
      'patterns_file' : 'online_tickets.patterns',
      'rules_file' : 'online_tickets.rules'
    },
    'toner_online' : {
      'domains_file' : 'toner_online.cluster',
      'db_file' : 'toner_online.dbinfo',
      'patterns_file' : 'toner_online.patterns',
      'rules_file' : 'toner_online.rules'
    },
    'travel' : {
      'domains_file' : 'travel.cluster',
      'db_file' : 'travel.dbinfo',
      'patterns_file' : 'travel.patterns',
      'rules_file' : 'travel.rules'
    }
  };
}

////////////////////////////////////////////////////////////////////////////////
//
// @brief create the FIDS map (fid name -> FID object) from a list of names
//
function generateFidsMap(fidsNamesList) {
  return new Promise(function(resolve, reject) {
     // return the map fid_name -> fid instance
     var result = {};
     for (let fidName of fidsNamesList) {
      switch (fidName) {
        case 'topHour':
        result[fidName] = new TopHourFID();
        break;
        case 'topClusterVisits':
        result[fidName] = new TopClusterVisitsFID();
        break;
        case 'signalDetectedFilter':
        result[fidName] = new SignalDetectedFilterFID();
        break;
      }
    }
    resolve(result);
  });
}

////////////////////////////////////////////////////////////////////////////////
//
// @brief generate a list of databases from db_name to db instance (from a list of names)
//
function generateDBMap(dbsNamesList) {
  return new Promise(function(resolve, reject) {
    var result = {};
    for (let dbName of dbsNamesList) {
      switch (dbName) {
        case 'datetime_db':
          result[dbName] = new DateTimeDB();
          break;
        case 'domain_info_db':
          result[dbName] = new DomainInfoDB();
          break;
        case 'general_db':
          result[dbName] = new GeneralDB();
          break;
      }
    }
    resolve(result);
  });
}


////////////////////////////////////////////////////////////////////////////////
//
// @brief This class will be in charge of handling the offers and almost everything
//        else. This is the main class.
//
export function OfferManager() {
  // the mappings we will use
  this.mappings = null;
  // the intent detectors mapping (clusterID -> intent detector)
  this.intentDetectorsMap = {};
  // the intent input maps (clusterID -> intentInput)
  this.intentInputMap = {};
  this.offerFetcher = null;
  // the ui manager (we need to provide UI data for this)
  this.uiManager = new UIManager();
  this.uiManager.configureCallbacks({
    'show_coupon': this.checkButtonUICallback.bind(this),
    'not_interested': this.notInterestedUICallback.bind(this),
    'information': this.informationUICallback.bind(this),
    'extra_events': this.extraEventsUICallback.bind(this),
    'close_btn_clicked': this.onCloseBtnClickedUICallback.bind(this),
    'on_offer_shown': this.offerShownUICallback.bind(this),
    'on_offer_hide': this.offerHideUICallback.bind(this),
    'cp_to_clipboard': this.copyToClipboardUICallback.bind(this)
  });

  this.userDB = null;

  // create the stats handler
  this.statsHandler = new StatsHandler();

  // create the ID counter we will use to handle the offers, we need to be able
  // to identify each offer uniquely since we need to track them with these ids.
  this.offerIDCounter = 0;
  // this map will contain the list of offers and the given data for each offer
  this.currentOfferMap = {};
  // the clusterID -> offerID map.
  this.cidToOfferMap = {};
  // track the number of events of all the clusters and also the global num of events
  this.eventsCounts = {total: 0};
  // track shown offers
  this.offersShownCounterMap = {};

  // the offers subclusters info (A|B): clusterID -> {}
  this.offerSubclusterInfo = null;

  // the fetcher
  let destURL = GoldrushConfigs.OFFER_FETCHER_DEST_URL;
  let self = this;
  parseMappingsFileAsPromise('mappings.json').then(function(mappings) {
    self.mappings = mappings;

    // create the subcluster information
    self.loadOfferSubclusters();

    LoggingHandler.info(MODULE_NAME, 'setting the mappings to the offer manager');
    self.offerFetcher = new OfferFetcher(destURL, mappings);
  }).then(function() {
      return self.getUserDB(self.mappings);
  }).then(function(userDB) {
      self.userDB = userDB;
  }).then(function() {
      LoggingHandler.info(MODULE_NAME, 'load the clusters and create the');
      self.clusterFilesMap = getClustersFilesMap();
      LoggingHandler.info(MODULE_NAME, 'self.clusterFilesMap: ' + JSON.stringify(self.clusterFilesMap));
      LoggingHandler.info(MODULE_NAME, 'calling generateIntentsDetector');
      self.generateIntentsDetector(self.clusterFilesMap);

      // now here we need to check the history of the user so we can load the
      // old events and more
      self.loadHistoryEvents();
  });

}

////////////////////////////////////////////////////////////////////////////////
//                        "PRIVATE" METHODS
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
//
// @brief This method will read the history of the user and will feed the intent
//        input with the events
//
OfferManager.prototype.loadHistoryEvents = function() {
  if (!GoldrushConfigs.LOAD_HISTORY_EVENTS) {
    LoggingHandler.info(MODULE_NAME, 'skipping the LOAD_HISTORY_EVENTS since flag is false');
    return;
  }

  // here we need to get all the visits (moz_historyvisits) in the last N days
  // and join them with the moz_places table to get the urls.
  //
  // \ref: http://softholmsyndrome.com/2014/10/27/places-sqlite.html
  // CREATE INDEX moz_historyvisits_placedateindex ON moz_historyvisits (place_id, visit_date);
  // CREATE UNIQUE INDEX moz_places_url_uniqueindex ON moz_places (url);
  //
  // the SQL should look something like this:
  // SELECT url, visit_date FROM moz_historyvisits INNER JOIN moz_places ON
  //  moz_historyvisits.place_id = moz_places.id WHERE visit_date > "1466499090175383"
  //  ORDER BY visit_date ASC;
  //

  var self = this;

  // calculate the delta time to fetch the data from
  const currentTs = Date.now();
  const absoluteTimestamp = currentTs -
    (GoldrushConfigs.HISTORY_EVENTS_TIME_DAYS * GoldrushConfigs.DAY * 1000);
  const sqlQuery = 'SELECT url, visit_date FROM moz_historyvisits INNER JOIN moz_places ON ' +
                   'moz_historyvisits.place_id = moz_places.id WHERE visit_date > ' +
                   absoluteTimestamp + ' ORDER BY visit_date ASC;';

  LoggingHandler.info(MODULE_NAME, 'loading the history events now with query: ' + sqlQuery);
  // execute the query now
  let eventCounts = 0;
  CliqzHistoryManager.PlacesInterestsStorage._execute(sqlQuery,
                                                      ['url', 'visit_date'],
                                                      function(result) {
      var urlObj = CliqzUtils.getDetailsFromUrl(result.url);
      const timestamp = Number(result.visit_date) / 1000; // convert microseconds to ms
      self.feedWithHistoryEvent(urlObj, timestamp);
      eventCounts += 1;
    },
    null
    ).then(function() {
      // nothing to do
      LoggingHandler.info(MODULE_NAME,
                         'finishing feeding from history. Number of events: ' + eventCounts);
    }
  );
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will generate the intent detection system with the current
//        data we have. It will load all the intent detector and also generate
//        the map from cluster_id -> intent_detector.
//        we will also generate the cluster_id -> intentInput
//
OfferManager.prototype.generateIntentsDetector = function(clusterFilesMap) {
  let self = this;
  check(this.mappings != null, 'mappings is not properly initialized');

  var sessionThresholdTimeSecs = GoldrushConfigs.INTENT_SESSION_THRESHOLD_SECS;
  var buyIntentThresholdSecs = GoldrushConfigs.BUY_INTENT_SESSION_THRESHOLD_SECS;

  for (var clusterName in clusterFilesMap) {
    // get the given cluster ID from the name.
    let clusterID = this.mappings['cname_to_cid'][clusterName];
    if (typeof clusterID === 'undefined') {
      LoggingHandler.info(MODULE_NAME, 'cluster with name ' + clusterName + ' was not found');
      continue;
    }

    // init the this.eventsCounts to 0
    this.eventsCounts[clusterID] = 0;

    // // generate the intent input
    this.intentInputMap[clusterID] = new IntentInput(sessionThresholdTimeSecs, buyIntentThresholdSecs);

    // we need to build the current cluster system.
    let dbFilePath = clusterFilesMap[clusterName]['db_file'];
    let rulesFilePath = clusterFilesMap[clusterName]['rules_file'];

    check(dbFilePath !== undefined, 'dbFilePath is undefined?');
    check(rulesFilePath !== undefined, 'rulesFilePath is undefined?');

    // we need to read the db file and the rule file and then we are able
    // to fully build the intentDetector for this particular cluster.

    var dbFilePromise = new Promise(function(resolve, reject) {
      // read the resource
      let rscLoader = new ResourceLoader(['goldrush/clusters', dbFilePath], {});
      rscLoader.load().then(json => {resolve(json);});
    });
    var rulesFilePromise = new Promise(function(resolve, reject) {
      // read the resource
      let rscLoader = new ResourceLoader(['goldrush/clusters', rulesFilePath], {dataType: 'raw'});
      rscLoader.load().then(str => {resolve(str);});
    });

    // get all the data and then construct the intent detector and push it into
    // the map
    let dbInstancesMap = null;
    let rulesInstancesMap = null;
    let dbsJson = null;
    let rulesStr  = null;
    Promise.all([dbFilePromise, rulesFilePromise]).then(function(results) {
      // we need now to build the intent detector
      dbsJson = results[0];
      rulesStr = results[1];
      let dbsNames = Object.keys(dbsJson); // extract keys from json object
      return generateDBMap(dbsNames);
    }).then(function(dbInstancesMapResult) {
      dbInstancesMap = dbInstancesMapResult;
      //add cluster related section of userDB to instacen
      dbInstancesMap['user_db'] = self.userDB[clusterID];
      LoggingHandler.info(MODULE_NAME, 'dbInstancesMap' + JSON.stringify(dbInstancesMap, null, 4));

      // get the rules information
      rulesStr = rulesStr.replace(/(\n)+/g, ' ');
      // TODO: here we may want to get the FIDS names, but for now we will get
      // a map for all the fids and then we can remove the objects (nasty because)
      // we allocate them and then we remove it...
      let rulesNames = ['topHour', 'topClusterVisits', 'signalDetectedFilter'];
      return generateFidsMap(rulesNames);
    }).then(function(rulesInstancesMapResult) {
      rulesInstancesMap = rulesInstancesMapResult;
      LoggingHandler.info(MODULE_NAME, 'rulesInstancesMap' + JSON.stringify(rulesInstancesMap, null, 4));
    }).then(function() {
      let intentDetector =  new IntentDetector(clusterID, self.mappings, dbInstancesMap, rulesInstancesMap);
      // try to load everything now
      try {
        intentDetector.loadDataBases(dbsJson);
        intentDetector.loadRule(rulesStr);
        self.intentDetectorsMap[clusterID] = intentDetector;
      } catch (e) {
        LoggingHandler.error(MODULE_NAME,
                             'something happened when configuring the intent ' +
                             'detector for cluster ' + clusterName +
                             '. Error: ' + e,
                             LoggingHandler.ERR_INTERNAL);
      }
    }).catch(function(errMsg) {
      LoggingHandler.error(MODULE_NAME,
                           'Some error happened when reading and parsing the ' +
                           'files for the cluster ' + clusterName +
                           '. Error: ' + errMsg,
                           LoggingHandler.ERR_JSON_PARSE);
    });
  }


};

////////////////////////////////////////////////////////////////////////////////
//
// @brief Unload all the class
//
OfferManager.prototype.destroy = function() {
  // TODO: ensure this function is being called from the parent class
  if (this.statsHandler) {
    this.statsHandler.destroy();
  }
  // save userdb
  if(this.userDB) {
    let rscLoader = new ResourceLoader(
        [ 'goldrush', 'user_db.json' ],
        {}
    );
    rscLoader.persist(JSON.stringify(this.userDB, null, 4)).then(data => {
            LoggingHandler.info(MODULE_NAME,
                               'userDB successfully updated: ' + JSON.stringify(data, null, 4));
          });
  }

};

////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will load the groups (A|B for now) for the clusters (if we have)
//        to check what kind of logic we need to apply when selection the offer
//        to show.
// Expected format of the file:
//  {
//    cluster_id: {
//      'A': [dom1, dom2, ...],
//      'B': [domN+1, domN+2, ...],
//    }
//  }
// we will generate the this.offerSubclusterInfo structure with the following
// (transforming them into domain IDs)
// information:
//  {
//    cluster_id: {
//      'A': Set(dom_ID, dom_ID2, ...),
//      'B': set(dom_IDN+1, dom_IDN+2, ...),
//    }
//  }
//
OfferManager.prototype.loadOfferSubclusters = function() {
  let rscLoader = new ResourceLoader(
    [ 'goldrush', 'offer_subclusters.json' ],
    {}
  );
  rscLoader.load().then(json => {
    LoggingHandler.info(MODULE_NAME,
                       'loading the json for loadOfferSubclusters json stringify: ' +
                       JSON.stringify(json));
    // we now load all the clusters and all the domains and we convert the domains
    // into domains ids
    this.offerSubclusterInfo = {};

    for (let cid in json) {
      if (!json.hasOwnProperty(cid)) {
        continue;
      }

      // now convert 'A' and 'B' into sets
      var currentCluster = json[cid];
      if (!currentCluster['A'] || !currentCluster['B']) {
        LoggingHandler.warning(MODULE_NAME,
                               'it is missing A or B in the ' +
                               'file?... we will skip this one');
        continue;
      }

      this.offerSubclusterInfo[cid] = {};
      const tagList = ['A', 'B'];
      for (let tagIndex in tagList) {
        const tag = tagList[tagIndex];
        // iterate over the list and generate the set with domains IDS
        this.offerSubclusterInfo[cid][tag] = new Set();
        for (let domNameIndex in currentCluster[tag]) {
          const domName = currentCluster[tag][domNameIndex];
          const domID = this.mappings['dname_to_did'][domName];
          if (domID === undefined) {
            LoggingHandler.error(MODULE_NAME,
                                 'There is a domain in the subclusters that is not ' +
                                 'listed in the global cluster file? or in the ' +
                                 'mappings? domName: ' + domName + ' - clusterID: ' + cid,
                                 LoggingHandler.ERR_INTERNAL);
            continue;
          }
          this.offerSubclusterInfo[cid][tag].add(Number(domID));
          LoggingHandler.info(MODULE_NAME,
                             'adding domain: ' + domName + ' - ' + domID + ' to tag ' + tag);
        }
      }
    }
    LoggingHandler.info(MODULE_NAME,
                       'loadOfferSubclusters: ' + JSON.stringify(this.offerSubclusterInfo));
  }.bind(this)).catch(function(e) {
    LoggingHandler.error(MODULE_NAME,
                         'Loading the OfferSubclusters: ' + e,
                         LoggingHandler.ERR_JSON_PARSE);
  });
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will format an event into the struct we need to call the
//        intent input.
//        will return null if the event is not related with any cluster.
// @note check the intent input to see which is the expected format
//
OfferManager.prototype.formatEvent = function(urlObj, aTimestamp) {
  if (!this.mappings) {
    return null;
  }

  // we need to detect if we are in a domain of some cluster.
  const domainName = urlObj['name'];
  const domainID = this.mappings['dname_to_did'][domainName];
  if (!domainID) {
    // skip this one
    return null;
  }

  const fullURL = urlObj['domain'] + urlObj['path'] ;
  // This is how the other modules at cliqz does it
  const timestamp = aTimestamp;
  // check if we are in a checkout page?
  const checkoutFlag = this.isCheckoutPage(urlObj);
  // TODO_QUESTION: how to get the last url?
  const lastURL = '';
  // TODO_QUESTION: how to get the referrer url?
  const referrerURL = urlObj.referrer;

  // for now we don't have anything here
  const eventType = null;

  // full event info:
  //
  // 'event_type'
  // 'full_url'
  // 'ts'
  // 'domain_id'
  // 'checkout_flag'
  // 'last_url'
  // 'referrer_url
  // 'extra'

  return {
    'event_type' : eventType,
    'full_url' : fullURL,
    'ts' : timestamp,
    'domain_id' : domainID,
    'checkout_flag' : checkoutFlag,
    'last_url' : lastURL,
    'referrer_url' : referrerURL,
    'extra' : null
  };
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief This method will check if we need to evaluate the intent system for
//        a particular cluster / event.
// @return true if we should | false otherwise
//
OfferManager.prototype.shouldEvaluateEvent = function(clusterID, event) {
  // TODO: implement this logic here
  return (clusterID >= 0) ? true : false;
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief Get the best coupon from the backend response and the given cluster.
// @return the coupon | null if there are no coupon
//
OfferManager.prototype.getBestCoupon = function(evtDomID, evtClusterID, vouchers) {
  if (!vouchers) {
    return null;
  }

  // we need to apply the new A|B logic here and also add the new telemetry
  // signals
  // The following logic will be applied depending of the switch flag:
  // We have 2 subclusters: A, B.
  // if switchFlag == true => A->B and B->A
  // else => A -> A and B -> B
  //
  // for those clusters that we don't have this subclusters we always follow
  // the next logic:
  // - We always show a voucher.
  // - if we are in a domain and we have a voucher from another domain we show
  //   that first
  // - otherwise we show the voucher of the same domain.
  // - track this with a counter in stats (voucher_on_same_domain or whatever).
  //

  // get the global flag if we need to switch or not
  const switchFlag = GoldrushConfigs.OFFER_SUBCLUSTER_SWITCH;

  // check if we have a subcluster mapping
  var subclusterMap = (this.offerSubclusterInfo !== null) ? this.offerSubclusterInfo[evtClusterID]
                                                          : undefined;

  // get a default voucher just in case
  var voucher = null;
  for (var did in vouchers) {
    if (!vouchers.hasOwnProperty(did)) {
      continue;
    }
    let coupons = vouchers[did];
    if (coupons.length > 0) {
      voucher = coupons[0];
      break;
    }
  }

  LoggingHandler.info(MODULE_NAME,
                     'getBestCoupon: selecting best coupon for switch: ' + switchFlag +
                     ' - subclusterMap: ' + subclusterMap);

  // this function will select from the list of vouchers and a set of domains ids
  // the one that "best" matches. If set of domains is empty then any will be chosen
  function selectBestVoucher(voucherMap, domSet) {
    var rvoucher = null;
    for (var did in voucherMap) {
      if (!voucherMap.hasOwnProperty(did) || (domSet.size > 0 && !domSet.has(Number(did)))) {
        continue;
      }
      // this domain is good for us, still we need to check if there is a better
      // one
      let coupons = voucherMap[did];
      if (coupons.length > 0) {
        rvoucher = coupons[0];
        if (rvoucher) {
          break;
        }
      }
    }
    return rvoucher;
  }

  // apply the main logic
  if (subclusterMap) {
    printSet('A', subclusterMap['A']);
    printSet('B', subclusterMap['B']);
    // we need to use the cluster thing to get the best voucher
    const userOnSubcluster = (subclusterMap['A'].has(evtDomID)) ? 'A' : 'B';
    if (!subclusterMap[userOnSubcluster].has(evtDomID)) {
      LoggingHandler.error(MODULE_NAME,
                           'The user is not nor in A or B subcluster, this is an error. ' +
                           'userEvtID: ' + evtDomID + '\ttag: ' + userOnSubcluster +
                           '\tsubclusterMap: ' + JSON.stringify(subclusterMap),
                           LoggingHandler.ERR_INTERNAL);
      return voucher;
    }
    // now check if we need to switch or not
    var subclusterToSearch = '';
    if (switchFlag) {
      // we need to get a coupon from the other side
      subclusterToSearch = userOnSubcluster === 'A' ? 'B' : 'A';
    } else  {
      subclusterToSearch = userOnSubcluster;
    }
    // search in this
    LoggingHandler.info(MODULE_NAME,
                       'getBestCoupon: selecting voucher for subcluster: ' + subclusterToSearch +
                       ' - user on subcluster: ' + userOnSubcluster +
                       ' - userDomainID: ' + evtDomID);
    const domainsToSearch = subclusterMap[subclusterToSearch];
    let localVoucher = selectBestVoucher(vouchers, domainsToSearch);

    // check if we found a voucher we want
    if (!localVoucher) {
      LoggingHandler.error(MODULE_NAME,
                           'We didnt find a voucher for the cluster we were looking for ' +
                           'so we will return the default one',
                           LoggingHandler.ERR_INTERNAL);
      return voucher;
    }

    // we found one, add the subcluster flag and just return it
    localVoucher['subcluster_tag'] = subclusterToSearch;
    return localVoucher;
  } else {
    // we just need to get any voucher that is not evtDomID if possible
    LoggingHandler.info(MODULE_NAME,
                       'getBestCoupon: selectiong the best voucher from all (no A|B logic)');
    return selectBestVoucher(vouchers, new Set());
  }

};

////////////////////////////////////////////////////////////////////////////////

//
// @brief this method will be called when the system detects a new offer and
//        we need to track it with the given coupon.
// @param coupon is the coupon object that will be modified and added the offer_id
//        and maintain all the fields
// @return the new offer created (couponInfo + offer_id)
//
OfferManager.prototype.createAndTrackNewOffer = function(coupon, timestamp, clusterID, domainID) {
  // for simplicity we will also get the domain ID (if any) from the coupon redirect_url
  // so we can simply later check if we are in the current domain or not when
  // showing the add
  var redirectUrl = utils.getDetailsFromUrl(coupon.redirect_url);
  const redirectDomID = this.mappings['dname_to_did'][redirectUrl.name];

  // generate a new offer with a new id
  const offerID = this.offerIDCounter++;
  var offer = {
    voucher_data: coupon,
    offer_id: offerID,
    appear_on_did: domainID,
    appear_on_cid: clusterID,
    active: true,
    redirect_url_did: (redirectDomID === undefined) ? -1 : redirectDomID
  };

  // add to the maps
  this.currentOfferMap[offerID] = offer;
  this.cidToOfferMap[clusterID] = offerID;

  // notify the stats handler
  if (this.statsHandler) {
    this.statsHandler.offerCreated(clusterID);
    // notify the telemetry now with the A|B flags
    const voucherShownOnSameDomain = (coupon.domain_id === domainID);
    if (voucherShownOnSameDomain) {
      this.statsHandler.offerOnSameDomain(clusterID);
    }
    if (coupon.hasOwnProperty('subcluster_tag')) {
      this.statsHandler.offerShownOnSubcluster(clusterID, coupon.subcluster_tag);
    }
  }

  // Every time we show a offer add it to this maps. It will help us track
  // is our coupon where used or not
  let couponCode = coupon.code;
  if(this.offersShownCounterMap.hasOwnProperty(couponCode)) {
    this.offersShownCounterMap[couponCode] += 1;
  } else {
    this.offersShownCounterMap[couponCode] = 1;
  }
  LoggingHandler.info(MODULE_NAME,
                     'offersShownCounterMap content: ' + JSON.stringify(this.offersShownCounterMap));

  // set the timeout to disable this add
  offer.timerID = CliqzUtils.setTimeout(function () {
    // check if we are showing the add, if not we just remove it
    this.removeAndUntrackOffer(offerID);
  }.bind(this), GoldrushConfigs.HIDE_OFFER_MS);

  return offer;
};

//
// @brief removes a particular offer with a given id
//
OfferManager.prototype.removeAndUntrackOffer = function(offerID) {
  // - search for the offer on the maps and remove it
  // - disable the disabler timer
  LoggingHandler.info(MODULE_NAME, 'removing and untracking offer with ID: ' + offerID);

  var offer = this.currentOfferMap[offerID];
  if (!offer) {
    LoggingHandler.info(MODULE_NAME, 'offer no longer valid with id: ' + offerID);
    return;
  }

  // make the offer inactive
  offer.active = false;

  // disable the timeout
  CliqzUtils.clearTimeout(offer.timerID);

  const clusterID = offer.appear_on_cid;

  // remove it from the UI if we are showing it
  if (this.uiManager.isOfferForClusterShownInCurrentWindow(clusterID)) {
    this.uiManager.hideOfferOfClusterFromCurrentWindow(clusterID);
  }

  if (this.cidToOfferMap[clusterID] === undefined) {
    LoggingHandler.error(MODULE_NAME,
                         'ERROR: we couldnt find the offer for cluster ID: ' + clusterID,
                         LoggingHandler.ERR_INTERNAL);
  } else {
    delete this.cidToOfferMap[clusterID];
  }

  delete this.currentOfferMap[offerID];
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief flag is the user is on a checkout page
//
OfferManager.prototype.isCheckoutPage = function(urlObj) {
  if (this.mappings['dname_to_checkout_regex']){
    let regexForDomain = this.mappings['dname_to_checkout_regex'][urlObj['name']];
    LoggingHandler.info(MODULE_NAME, 'isCheckoutPage#regexForDomain: ' + regexForDomain);
    LoggingHandler.info(MODULE_NAME, 'isCheckoutPage#friendly_url: ' + urlObj['friendly_url']);
    if (regexForDomain && urlObj['friendly_url'].match(regexForDomain)) {
      LoggingHandler.info(MODULE_NAME, 'isCheckoutPage: true');
      return true;
    }
  }
  LoggingHandler.info(MODULE_NAME, 'isCheckoutPage: false');
  return false;
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief ...
//
OfferManager.prototype.getUserDB = function(mappings) {
  return new Promise(function (resolve, reject) {
      LoggingHandler.info(MODULE_NAME, 'inside getUserDB');
      let rscLoader = new ResourceLoader(
        [ 'goldrush', 'user_db.json' ],
        {}
      );
      rscLoader.load().then(function(json) {
        // file exist so return it
        LoggingHandler.info(MODULE_NAME, 'userDB already exist. So loading it');
        resolve(json);
      }).catch(function(errMsg) {
        //w we need to creat file as it doenst exist
        LoggingHandler.warning(MODULE_NAME, errMsg);
        LoggingHandler.info(MODULE_NAME, 'userDB not found. Creating it...');
        let userDB = {};
        for (let cid in mappings['cid_to_cname']) {
          userDB[cid] = {};
        }
        rscLoader.persist(JSON.stringify(userDB, null, 4)).then(data => {
          LoggingHandler.info(MODULE_NAME,
                             'userDB successfully created: ' + JSON.stringify(data, null, 4));
          resolve(data);
        });
      });
  });
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will show (if needed) an offer for this particular cluster
//        If we need to show it then we will do it here
//
OfferManager.prototype.showOfferIfNeeded = function(clusterID, domainID) {
  // we check if we have an offer for this particular cluster
  const offerID = this.cidToOfferMap[clusterID];
  if (offerID === undefined) {
    // nothing related with this cluster
    // TODO: here still could be the case that we are showing and old
    // ad and we need to close it... if the ui has an offer from this cluster
    // but we don't have any => hide it.
    // remove it from the UI if we are showing it
    if (this.uiManager.isOfferForClusterShownInCurrentWindow(clusterID)) {
      this.uiManager.hideOfferOfClusterFromCurrentWindow(clusterID);
    }
    return;
  }

  // we have an offer, check if we are showing this one in particular
  const offer = this.currentOfferMap[offerID];
  if (!offer) {
    LoggingHandler.error(MODULE_NAME,
                         'This cannot happen here... there is inconsistent data',
                         LoggingHandler.ERR_INTERNAL);
    return;
  }

  // we show the offer now in this tab if it is not being shown already
  if (this.uiManager.isOfferForClusterShownInCurrentWindow(clusterID)) {
    // nothing to do
    return;
  }

  // else we need to show the current offer in this window
  this.uiManager.showOfferInCurrentWindow(offer, offer.redirect_url_did === domainID);
};



////////////////////////////////////////////////////////////////////////////////
//                          PUBLIC INTERFACE
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
//
// @brief This method will get events from the history and will fill in the
//        intent input systems if we have. This way we can have real longer
//        sessions
//
OfferManager.prototype.feedWithHistoryEvent = function(urlObject, timestamp) {
  // - parse the url and format the event.
  // - check if the event belongs to any cluster we are tracking
  // - check if we have an intent system
  // - feed it with the event.
  // - update the events counters...

  var event = this.formatEvent(urlObject, timestamp);
  if (!event) {
    // we skip this event.
    return;
  }

  // get the associated cluster
  const domainName = this.mappings['did_to_dname'][event['domain_id']];
  const clusterID = this.mappings['dname_to_cid'][domainName];
  const domainID = event['domain_id'];
  if (!clusterID || clusterID < 0) {
    // this cannot happen since we got a valid domainID from the mappings but
    // we don't have the given cluster ID in the mappings? this is not gut
    LoggingHandler.error(MODULE_NAME,
                         'Invalid cluster id!: ' + domainName,
                         LoggingHandler.ERR_INTERNAL);
    return;
  }

  // count the number of visits
  this.eventsCounts.total += 1;
  this.eventsCounts[clusterID] += 1;

  // get the associated intent system
  let intentInput = this.intentInputMap[clusterID];
  if (!intentInput) {
    LoggingHandler.warning(MODULE_NAME,
                           'WARNING: we still dont have a intent system for ' +
                           'cluster ID: ' + clusterID,
                           LoggingHandler.ERR_INTERNAL);
    return;
  }

  // feed with the event
  intentInput.feedWithEvent(event);
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief This method should be called everytime the tab of the browser has
//        changed or the window itself. This method will be used mainly
//        to remove all the offers that are not longer valid in the tabs.
//        (nasty but temporary).
//
OfferManager.prototype.onTabOrWinChanged = function(currUrl) {
  if (!this.mappings || !currUrl || !currUrl.name) {
    LoggingHandler.warning(MODULE_NAME, 'onTabOrWinChanged: null something');
    // nothing to do
    return;
  }

  // get the cluster ID if we have one
  const domainID = this.mappings['dname_to_did'][currUrl.name];
  if (!domainID) {
    return;
  }
  const clusterID = this.mappings['dname_to_cid'][currUrl.name];

  // now we need to check if we have to show or not the
  this.showOfferIfNeeded(clusterID, domainID);
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will evaluate a new event from the user.
//        Here we will get a specific value for the given event and we should do
//        all the logic of showing a coupong if our system detects a coupon or not.
//
OfferManager.prototype.processNewEvent = function(urlObject) {
  LoggingHandler.info(MODULE_NAME, 'processNewEvent');
  // here we need to:
  // 1) parse the url information and format it in a way that the intent intput
  //    can handle
  // 2) check if we are in a cluster or not and if we are then we evaluate the
  //    intention value.
  // 3) feed the intent input from the given cluster.
  // 4) Filter by any logic if we need or want to show an ad for this cluster
  //    or not (external checker / filter).
  // 5) If we don't need to filter then we evaluate the intent detector system
  //    and check if we have or not an intention
  // 6) if we have an intention -> get a coupon from the backend.
  // 7) Select the "best" coupon (first one, or whatever).
  // 8) execute the UIManager to show a coupon to the user.
  // 9) Activate tracking system to see if the user clicked or not in a link so
  //    we can identify and detect the coupon field to verify if the user
  //    used it or not.

  // (1) & (2)
  var event = this.formatEvent(urlObject, Date.now());
  LoggingHandler.info(MODULE_NAME, 'event' + JSON.stringify(event, null, 4));
  if (!event) {
    // we skip this event.
    LoggingHandler.info(MODULE_NAME, 'skipping event has domain relevant');
    return;
  }

  // get the associated cluster
  const domainName = this.mappings['did_to_dname'][event['domain_id']];
  const clusterID = this.mappings['dname_to_cid'][domainName];
  const domainID = event['domain_id'];
  if (!clusterID || clusterID < 0) {
    // this cannot happen since we got a valid domainID from the mappings but
    // we don't have the given cluster ID in the mappings? this is not gut
    LoggingHandler.error(MODULE_NAME,
                         'Invalid cluster id!: ' + domainName,
                         LoggingHandler.ERR_INTERNAL);
    return;
  }

  // track in the stats
  if (this.statsHandler) {
    this.statsHandler.userVisitedCluster(clusterID);
  }

  // count the number of visits
  this.eventsCounts.total += 1;
  this.eventsCounts[clusterID] += 1;

  // check if we need to show something in this cluster
  // the following line is commented
  //    this.showOfferIfNeeded(clusterID, domainID);
  // because of TODO: GR-137 && GR-140: temporary fix. now we track this in other
  // method

  // get the associated intent system
  let intentSystem = this.intentDetectorsMap[clusterID];
  let intentInput = this.intentInputMap[clusterID];
  if (!intentSystem || !intentInput) {
    LoggingHandler.error(MODULE_NAME,
                       'we still dont have a intent system for cluster ID: ' + clusterID);
    return;
  }

  // (3)
  intentInput.feedWithEvent(event);

  // (4)
  if (!this.shouldEvaluateEvent(clusterID, event)) {
    // skip it
    return;
  }

  // here we check if there is a new bought or not, we will only send one signal
  // per buying activity
  if (intentInput.currentBuyIntentSession().checkoutsCount() === 1) {
    if (this.statsHandler) {
      this.statsHandler.userProbablyBought(domainID, clusterID);
    }
  }

  // (5)
  const intentValue = intentSystem.evaluateInput(intentInput);
  LoggingHandler.info(MODULE_NAME, 'intentValue: ' + intentValue);

  // (6)
  const thereIsAnIntention = intentValue >= 1.0;
  if (!thereIsAnIntention) {
    // nothing to do, we skip this
    return;
  }

  // we detect an intention, we track this now
  if (this.statsHandler) {
    this.statsHandler.systemIntentionDetected(domainID, clusterID);
  }

  // check if we have an offer already for this particular cluster, in that case
  // we don't show any other one since we can only show one per cluster
  if (this.cidToOfferMap[clusterID] !== undefined) {
    // skip this particular one
    LoggingHandler.info(MODULE_NAME,
                       'we already have an offer for clusterID: ' + clusterID +
                       ' so we dont show another one');
    return;
  }

  // we have an intention so we need to get the coupons from the fetcher
  if (!this.offerFetcher) {
    LoggingHandler.warning(MODULE_NAME,
                           'We dont have still the offerFetcher, we then skip this event?',
                           LoggingHandler.ERR_INTERNAL);
    return;
  }

  var self = this;
  this.offerFetcher.checkForCouponsByCluster(clusterID, function(vouchers) {
    if (!vouchers) {
      // nothing to do.
      return;
    }
    // (7)
    // else get the best coupon for this
    var bestCoupon = self.getBestCoupon(domainID, clusterID, vouchers);
    if (!bestCoupon) {
      LoggingHandler.warning(MODULE_NAME,
                             'we dont have vouchers for this particular cluser ' +
                             'ID: ' + clusterID,
                             LoggingHandler.ERR_INTERNAL);
      return;
    }

    // (9) we need to track it on the callback of the button since the user
    //     can cancel the coupon -> we don't care about it.

    // create and track this new offer now, and show it in the UI
    const timestamp = Date.now();
    var offer = self.createAndTrackNewOffer(bestCoupon, timestamp, clusterID, domainID);
    if (!offer) {
      LoggingHandler.error(MODULE_NAME,
                           'we couldnt create the offer?? for clusterID: ' + clusterID,
                           LoggingHandler.ERR_INTERNAL);
      return;
    }

    // we have a offer, show it into the UI for the user
    self.uiManager.showOfferInCurrentWindow(offer, offer.redirect_url_did === domainID);
  });



};


////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will be called everytime we detect that a coupon
//        was used on the page (This is done using content-scripts). This method
//        should then check if the coupon used was one we provided or not
//
OfferManager.prototype.addCouponAsUsedStats = function(domain, coupon) {
  LoggingHandler.info(MODULE_NAME, 'SR  ' + JSON.stringify(this.offersShownCounterMap));

  if(this.offersShownCounterMap.hasOwnProperty(coupon) && this.offersShownCounterMap[coupon] > 0){
    this.offersShownCounterMap[coupon] -= 1;
    let cid = this.mappings['dname_to_cid'][domain];
    this.statsHandler.couponUsed(cid);
    LoggingHandler.info(MODULE_NAME,
                       'Our coupon used :\t cid: ' + cid +  ' \t domain: ' +
                       domain + ' \tcoupon: ' + coupon);
  } else {
    let cid = this.mappings['dname_to_cid'][domain];
    this.statsHandler.externalCouponUsed(cid);
    LoggingHandler.info(MODULE_NAME,
                       'Unrecognized coupon used :\t cid: ' + cid  +
                       ' \t domain: ' + domain + ' \tcoupon: ' + coupon);
  }
  LoggingHandler.info(MODULE_NAME, 'SR  ' + JSON.stringify(this.offersShownCounterMap));
};


////////////////////////////////////////////////////////////////////////////////
//                          CALLBACKS FROM THE UI
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
//
// @brief when the user press on the "check coupon or view coupon"
//
OfferManager.prototype.checkButtonUICallback = function(offerID) {
  LoggingHandler.info(MODULE_NAME, 'checkButtonUICallback');

  const offer = this.currentOfferMap[offerID];
  if (!offer) {
    LoggingHandler.error(MODULE_NAME,
                         'there is no related offer with id ' + offerID,
                         LoggingHandler.ERR_INTERNAL);
    return;
  }

  // track the signal
  if (this.statsHandler) {
    this.statsHandler.couponClicked(offer.appear_on_cid);
  }

  // we will remove the timer here so the person can see the offer until he
  // close it
  CliqzUtils.clearTimeout(offer.timerID);

  // we will get the url to redirect from the coupon here
  const urlToGo = offer.voucher_data.redirect_url;
  if (!urlToGo) {
    LoggingHandler.error(MODULE_NAME,
                         'No redirect_url found in the voucher/coupon?',
                         LoggingHandler.ERR_INTERNAL);
    // close the offer
    return false;
  }

  // redirect to there
  openNewTabAndSelect(urlToGo);

  return true;
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief when the user press on the "not interested coupon callback"
//
OfferManager.prototype.notInterestedUICallback = function(offerID) {
  LoggingHandler.info(MODULE_NAME, 'notInterestedUICallback');

  // if the user explicetly says it doesnt want to see the add anymore then
  // we will close it here and everywhere
  //
  const offer = this.currentOfferMap[offerID];

  // if user closed this then we should stop tracking this add
  if (offer) {
    // track the stats
    if (this.statsHandler) {
      this.statsHandler.couponRejected(offer.appear_on_cid);
    }

    // remove the offer
    this.removeAndUntrackOffer(offer.offer_id);
  }

};

////////////////////////////////////////////////////////////////////////////////
//
// @brief when the user press on the "information"
//
OfferManager.prototype.informationUICallback = function(offerID) {
  LoggingHandler.info(MODULE_NAME, 'informationUICallback');

  const offer = this.currentOfferMap[offerID];
  if (offer) {
    // track the stats
    if (this.statsHandler) {
      this.statsHandler.showMoreInfoClicked(offer.appear_on_cid);
    }
  }

  // avoid closing the notification
  openNewTabAndSelect(GoldrushConfigs.OFFER_INFORMATION_URL);
  return true;
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief any other type of events from the bar
// @note https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Method/appendNotification#Notification_box_events
//
OfferManager.prototype.extraEventsUICallback = function(reason, offerID) {
  LoggingHandler.info(MODULE_NAME, 'extraEventsUICallback: ' + reason);

  if (reason === 'removed') {
    const offer = this.currentOfferMap[offerID];
    if (!offer) {
      LoggingHandler.error(MODULE_NAME,
                           'The offer is not valid with ID: ', offerID,
                           LoggingHandler.ERR_INTERNAL);
      return;
    }
    // track stats
    if (this.statsHandler) {
        this.statsHandler.advertiseClosed(offer.appear_on_cid);
    }
  }
  return true;
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief when the close button is clicked
//
OfferManager.prototype.onCloseBtnClickedUICallback = function(offerID) {
  LoggingHandler.info(MODULE_NAME, 'onCloseBtnClickedUICallback');

  const offer = this.currentOfferMap[offerID];
  if (!offer) {
    LoggingHandler.error(MODULE_NAME,
                        'Missing offer?? this is not possible: ' + offerID);
    return;
  }

  // track stats
  if (this.statsHandler) {
    this.statsHandler.advertiseClosedByUser(offer.appear_on_cid);
  }

  // remove the offer
  this.removeAndUntrackOffer(offer.offer_id);
  return true;
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief when the user press on the code to copy it to the clipboard
//
OfferManager.prototype.copyToClipboardUICallback = function(offerID) {
  LoggingHandler.info(MODULE_NAME, 'copyToClipboardUICallback');
  const offer = this.currentOfferMap[offerID];
  if (!offer) {
    LoggingHandler.error(MODULE_NAME,
                         'We are missing the offer that we just clicked?: ' + offerID);
    return;
  }

  const clusterID = offer['appear_on_cid'];
  // track this into stats (telemetry later)
  if (this.statsHandler) {
    this.statsHandler.copyToClipboardClicked(clusterID);
  }
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief when an offer is shown
//
OfferManager.prototype.offerShownUICallback = function(offerID) {
  LoggingHandler.info(MODULE_NAME, 'offerShownUICallback');
  if (!this.userDB) {
    return;
  }

  const offer = this.currentOfferMap[offerID];
  if (!offer) {
    LoggingHandler.error(MODULE_NAME,
                         'We are showing and offer that we dont have?: ' + offerID,
                         LoggingHandler.ERR_INTERNAL);
    return;
  }

  // get the needed fields
  const clusterID = offer['appear_on_cid'];
  const timestamp = Date.now();

  LoggingHandler.info(MODULE_NAME, 'offerShownUICallback: clusterID: ' + clusterID);

  // for now we will only add the last ad shown for a given cid and timestamp
  this.userDB[clusterID]['last_ad_shown'] = timestamp;

  // track this into stats (telemetry later)
  if (this.statsHandler) {
    this.statsHandler.advertiseDisplayed(clusterID);
  }
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief when an offer is hiden
//
OfferManager.prototype.offerHideUICallback = function(offerID) {
  // we are getting this event already on the extraEventsUICallback...
};












