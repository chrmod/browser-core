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

// TODO: review if this is fine
Components.utils.import("resource://gre/modules/Services.jsm");



////////////////////////////////////////////////////////////////////////////////
// Consts
//

// TODO: specify this values before the release

// the number of events outside of a particular cluster after we decide to hide
// the current offer (UI).
const OM_NUM_EVTS_DISABLE_OFFER = 3;
// the number of milliseconds we want to wait till we hide the add
const OM_HIDE_OFFER_MS = 1000 * 10;



////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function log(s){
  utils.log(s, 'GOLDRUSH - OFFER MANAGER');
}

// TODO: remove this and the usage of this method
//
function check(expression, message) {
  if (!expression) {
    log(message);
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
      log(json);
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
  // TODO: return a map:
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
      log(dbName);
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
  // the list of current coupons we have
  this.couponsList = null;
  // the ui manager (we need to provide UI data for this)
  this.uiManager = new UIManager();
  this.uiManager.configureCallbacks({
    'show_coupon': this.checkButtonUICallback.bind(this),
    'not_interested': this.notInterestedUICallback.bind(this),
    'information': this.informationUICallback.bind(this),
    'extra_events': this.extraEventsUICallback.bind(this),
    'on_offer_shown': this.offerShownUICallback.bind(this),
    'on_offer_hide': this.offerHideUICallback.bind(this)
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
  // track the current cluster
  this.currentCluster = -1;

  // the fetcher
  //TODO: use a globar variable here in the config maybe
  let destURL = 'http://mixer-beta.clyqz.com/api/v1/rich-header?path=/map&bmresult=vouchers.cliqz.com&';
  let self = this;
  parseMappingsFileAsPromise('mappings.json').then(function(mappings) {
    self.mappings = mappings;
    log('setting the mappings to the offer manager');
    self.offerFetcher = new OfferFetcher(destURL, mappings);
  }).then(function() {
      return self.getUserDB(self.mappings);
  }).then(function(userDB) {
      self.userDB = userDB;
  }).then(function() {
        log('load the clusters and create the');
        self.clusterFilesMap = getClustersFilesMap();
        log(self.clusterFilesMap);
        log('calling generateIntentsDetector');
        self.generateIntentsDetector(self.clusterFilesMap);
  });

}

////////////////////////////////////////////////////////////////////////////////
//                        "PRIVATE" METHODS
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will generate the intent detection system with the current
//        data we have. It will load all the intent detector and also generate
//        the map from cluster_id -> intent_detector.
//        we will also generate the cluster_id -> intentInput
//
OfferManager.prototype.generateIntentsDetector = function(clusterFilesMap) {
  let self = this;
  log('inside generateIntentsDetector222');
  check(this.mappings != null, 'mappings is not properly initialized');

  // TODO: read the values from the config maybe? for the following variables
  var sessionThresholdTimeSecs = 30*60;
  var buyIntentThresholdSecs = 60*60*24*10; // 10 days? TODO: change this with a proper value

  for (var clusterName in clusterFilesMap) {
    // get the given cluster ID from the name.
    let clusterID = this.mappings['cname_to_cid'][clusterName];
    if (typeof clusterID === 'undefined') {
      log('cluster with name ' + clusterName + ' was not found');
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
      log('result from dbFilePromise and rulesFilePromise');
      log(results);
      // we need now to build the intent detector
      dbsJson = results[0];
      rulesStr = results[1];
      let dbsNames = Object.keys(dbsJson); // extract keys from json object
      return generateDBMap(dbsNames);
    }).then(function(dbInstancesMapResult) {
      dbInstancesMap = dbInstancesMapResult;
      //add cluster related section of userDB to instacen
      dbInstancesMap['user_db'] = self.userDB[clusterID];
      log('dbInstancesMap' + JSON.stringify(dbInstancesMap, null, 4));

      // get the rules information
      rulesStr = rulesStr.replace(/(\n)+/g, ' ');
      // TODO: here we may want to get the FIDS names, but for now we will get
      // a map for all the fids and then we can remove the objects (nasty because)
      // we allocate them and then we remove it...
      let rulesNames = ['topHour', 'topClusterVisits', 'signalDetectedFilter'];
      return generateFidsMap(rulesNames);
    }).then(function(rulesInstancesMapResult) {
      rulesInstancesMap = rulesInstancesMapResult;
      log('rulesInstancesMap' + JSON.stringify(rulesInstancesMap, null, 4));
    }).then(function() {
      let intentDetector =  new IntentDetector(clusterID, self.mappings, dbInstancesMap, rulesInstancesMap);
      // try to load everything now
      try {
        intentDetector.loadDataBases(dbsJson);
        intentDetector.loadRule(rulesStr);
        self.intentDetectorsMap[clusterID] = intentDetector;
      } catch (e) {
        log('something happened when configuring the intent detector for cluster ' + clusterName);
        log('error: ' + e);
      }
    }).catch(function(errMsg) {
      log('Some error happened when reading and parsing the files for the cluster ' + clusterName);
      log('error: ' + errMsg);
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
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will format an event into the struct we need to call the
//        intent input.
//        will return null if the event is not related with any cluster.
// @note check the intent input to see which is the expected format
//
OfferManager.prototype.formatEvent = function(urlObj, aTimestamp) {
  log('formatEvent');
  if (!this.mappings) {
    return null;
  }

  // we need to detect if we are in a domain of some cluster.
  const domainName = urlObj['name'];
  const domainID = this.mappings['dname_to_did'][domainName];
  log('domainName' + domainName);
  log('domainID' + domainID);
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
  const referrerURL = '';

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
OfferManager.prototype.getBestCoupon = function(vouchers) {
  if (!vouchers) {
    return null;
  }

  for (var did in vouchers) {
    if (!vouchers.hasOwnProperty(did)) {
      continue;
    }
    let coupons = vouchers[did];
    if (coupons.length > 0) {
      return coupons[0];
    }
  }
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief This method will add all the mechanism to start tracking a particular
//        coupon so we can detect some events.
//
OfferManager.prototype.trackCoupon = function(coupon, originalURL) {
  // TODO: here we need to init all the system to track the coupon
};

//
// @brief This method should be called when we stop tracking a coupon for any reason
//        so we can remove the handlers and whatever we need.
// @param coupon is the coupon we will not track anymore
// @param reason is a value saying why we stop tracking the coupon
//
OfferManager.prototype.stopTrackingCoupon = function(coupon, reason) {
  // TODO: implement this method
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

  log('creating and tracking offer with ID: ' + offerID);
  log('redirectDOM: ' + coupon.redirect_url  + ' - ' + redirectUrl.name + ' - ' + redirectDomID);

  // add to the maps
  this.currentOfferMap[offerID] = offer;
  this.cidToOfferMap[clusterID] = offerID;

  // set the timeout to disable this add
  offer.timerID = CliqzUtils.setTimeout(function () {
    // check if we are showing the add, if not we just remove it
    this.removeAndUntrackOffer(offerID);
  }.bind(this), OM_HIDE_OFFER_MS);

  return offer;
};

//
// @brief removes a particular offer with a given id
//
OfferManager.prototype.removeAndUntrackOffer = function(offerID) {
  // TODO:
  // - search for the offer on the maps and remove it
  // - disable the disabler timer
  log('removing and untracking offer with ID: ' + offerID);

  var offer = this.currentOfferMap[offerID];
  if (!offer) {
    log('offer no longer valid with id: ' + offerID);
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
    log('ERROR: we couldnt find the offer for cluster ID: ' + clusterID);
  } else {
    delete this.cidToOfferMap[clusterID];
  }

  delete this.currentOfferMap[offerID];
};


//
// @brief this method will be called everytime we got an event for a particular
//        site and we will do all the logic here to show the offer if needed
//        in the given window
//
// OfferManager.prototype.handleUILogic = function(clusterID) {
//   // TODO:
//   // check if we have an offer related with this cluster.
//   // check if the offer is still valid (number of visits to the cluster).
//   //
//   let currentOffer = cidToOfferMap[clusterID];
//   if (currentOffer === undefined) {
//     // nothing to do
//     return;
//   }

//   // check for all the offers that are not related with this cluster
//   for (var did in this.cidToOfferMap) {
//     if (did === clusterID) {
//       continue;
//     }
//     // here we need to check if the number of events then is bigger than the
//     // threshold
//     const offerID = this.cidToOfferMap[did];
//     const offer = this.currentOfferMap[offerID];
//     if (!offer) {
//       log('ERROR: this cannot happen.');
//       continue;
//     }
//     const totalDiffEvts = this.eventsCounts.total - offer.totalEvents;
//     const clusterDiffEvents = this.eventsCounts[did] - offer.clusterEvents;
//     const totalOutsideEvents = totalDiffEvts - clusterDiffEvents;
//     if (totalOutsideEvents >= OM_NUM_EVTS_DISABLE_OFFER) {
//       // TODO: emit some event here maybe if it is not already tracked over
//       // the ui callbacks...
//       // we need to hide this offer and remove it (stop tracking it)
//       this.removeAndUntrackOffer(offer);
//     }

//   }
// };


////////////////////////////////////////////////////////////////////////////////
//
// @brief flag is the user is on a checkout page
//
OfferManager.prototype.isCheckoutPage = function(urlObj) {
  if (this.mappings['dname_to_checkout_regex']){
    // log('isCheckoutPage' + JSON.stringify(urlObj, null, 4));
    let regexForDomain = this.mappings['dname_to_checkout_regex'][urlObj['name']];
    log('isCheckoutPage#regexForDomain\t' + regexForDomain);
    log('isCheckoutPage#friendly_url\t' + urlObj['friendly_url']);
    if (regexForDomain && urlObj['friendly_url'].match(regexForDomain)) {
      log('isCheckoutPage#true');
      return true;
    }
  }
  log('isCheckoutPage#false');
  return false;
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief ...
//
OfferManager.prototype.getUserDB = function(mappings) {
  return new Promise(function (resolve, reject) {
      log('inside getUserDB');
      let rscLoader = new ResourceLoader(
        [ 'goldrush', 'user_db.json' ],
        {}
      );
        rscLoader.load().then(function(json) {
        // file exist so return it
        log('userDB already exist. So loading it');
        resolve(json);
      }).catch(function(errMsg) {
        //w we need to creat file as it doenst exist
        if(errMsg === undefined) {
          let userDB = {};
          for (let cid in mappings['cid_to_cname']) {
            userDB[cid] = {};
          }
          rscLoader.persist(JSON.stringify(userDB, null, 4)).then(data => {
            log('userDB successfully created: ' + JSON.stringify(data, null, 4));
            resolve(data);
          });
        }
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
    log('ERROR: this cannot happen here... there is inconsistent data');
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
  // TODO:
  // - parse the url and format the event.
  // - check if the event belongs to any cluster we are tracking
  // - check if we have an intent system
  // - feed it with the event.
  // - update the events counters...
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will evaluate a new event from the user.
//        Here we will get a specific value for the given event and we should do
//        all the logic of showing a coupong if our system detects a coupon or not.
//
OfferManager.prototype.processNewEvent = function(urlObject) {
  log('processNewEvent');
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
  log('event' + JSON.stringify(event, null, 4));
  if (!event) {
    // we skip this event.
    log('skipping event has domain relevant');
    return;
  }

  // get the associated cluster
  const domainName = this.mappings['did_to_dname'][event['domain_id']];
  const clusterID = this.mappings['dname_to_cid'][domainName];
  const domainID = event['domain_id'];
  if (!clusterID || clusterID < 0) {
    // this cannot happen since we got a valid domainID from the mappings but
    // we don't have the given cluster ID in the mappings? this is not gut
    log('ERROR: invalid cluster id!: ' + domainName);
    return;
  }

  this.eventsCounts.total += 1;
  this.eventsCounts[clusterID] += 1;
  this.currentCluster = clusterID;

  // check if we need to show something in this cluster
  this.showOfferIfNeeded(clusterID, domainID);

  // get the associated intent system
  let intentSystem = this.intentDetectorsMap[clusterID];
  let intentInput = this.intentInputMap[clusterID];
  if (!intentSystem || !intentInput) {
    log('WARNING: we still dont have a intent system for cluster ID: ' + clusterID);
    return;
  }

  // (3)
  intentInput.feedWithEvent(event);

  // (4)
  if (!this.shouldEvaluateEvent(clusterID, event)) {
    // skip it
    return;
  }

  // (5)
  const intentValue = intentSystem.evaluateInput(intentInput);
  log('intentValue: ' + intentValue);

  // (6)
  const thereIsAnIntention = intentValue >= 1.0;
  if (!thereIsAnIntention) {
    // nothing to do, we skip this
    return;
  }

  // we detect an intention, we track this now
  if (this.statsHandler) {
    this.statsHandler.systemIntentionDetected(event['domain_id'], clusterID);
  }

  // check if we have an offer already for this particular cluster, in that case
  // we don't show any other one since we can only show one per cluster
  if (this.cidToOfferMap[clusterID] !== undefined) {
    // skip this particular one
    log('we already have an offer for clusterID: ' + clusterID + ' so we dont show another one');
    return;
  }

  // we have an intention so we need to get the coupons from the fetcher
  if (!this.offerFetcher) {
    log('WARNING: we dont have still the offerFetcher, we then skip this event?');
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
    var bestCoupon = self.getBestCoupon(vouchers);
    if (!bestCoupon) {
      log('we dont have vouchers for this particular cluser ID: ' + clusterID);
      return;
    }

    // (9) we need to track it on the callback of the button since the user
    //     can cancel the coupon -> we don't care about it.

    // create and track this new offer now, and show it in the UI
    const timestamp = Date.now();
    var offer = self.createAndTrackNewOffer(bestCoupon, timestamp, clusterID, domainID);
    if (!offer) {
      log('we couldnt create the offer??');
      return;
    }

    // we have a offer, show it into the UI for the user
    self.uiManager.showOfferInCurrentWindow(offer, offer.redirect_url_did === domainID);
  });



};


////////////////////////////////////////////////////////////////////////////////
//
// @brief this method should be called everytime we change the url so we can
//        track if a coupon has been used or not. Basically here we will need
//        to check the content of the page and trigger an event when a button of
//        the checkout form is being used and analyze the content to search for
//        the associated coupon ID.
//
OfferManager.prototype.detectCouponField = function(url) {
  // TODO_QUESTION: ask how it is better to:
  // 1) read the content of the webpage to detect a field?
  // 2) modify a button form field to link a callback so we can get the event?
  // 3) read the content of the post request or the form fields when the button is
  //    pressed?
  // IMPORTANT how we can read the content of the html???? document.?
};


// TODO: this method will check a map: url_domain -> url_regex
//       to check if we are on the site where each url_domain has associated a
//       coupon (active ones).
OfferManager.prototype.getCurrentCoupons = function() {
  log('getCurrentCoupons called');
  if (!this.offerFetcher) {
    log('offerFetcher is null still');
    return;
  }

  // TODO: remove this from here since we should add it later, this function
  // will be called from outside whenever we need to get the coupons.
  this.offerFetcher.checkForCouponsByCluster(1, function(vouchers) {
    // TODO: add the field that has not being used here maybe.
      this.couponsList = vouchers;
    });
  log('returning the coupons list:' + this.couponsList);
  return this.couponsList;
};


////////////////////////////////////////////////////////////////////////////////
//                          CALLBACKS FROM THE UI
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
//
// @brief when the user press on the "check coupon or view coupon"
//
OfferManager.prototype.checkButtonUICallback = function() {
  // TODO: implement here all the needed logic and the
  log('checkButtonUICallback');

  // track the signal
  if (this.statsHandler) {
    this.statsHandler.couponClicked(this.currentCluster);
  }

  // get the current offer
  let offer = this.cidToOfferMap[this.currentCluster];
  offer = (offer === undefined) ? undefined : this.currentOfferMap[offer];
  if (!offer) {
    // nothing to do, close the offer :(
    return false;
  }

  // we will remove the timer here so the person can see the offer until he
  // close it
  CliqzUtils.clearTimeout(offer.timerID);

  // we will get the url to redirect from the coupon here
  const urlToGo = offer.voucher_data.redirect_url;
  if (!urlToGo) {
    log('ERROR: no redirect_url found in the voucher/coupon?');
    // close the offer
    return false;
  }

  // redirect to there
  openNewTabAndSelect(urlToGo);

  return true;

  // track it (get the current coupon from the ui manager)
  // TODO:
  // let currentCoupon = this.uiManager.getCurrentCoupon();
  // this.uiManager.showCouponInfo(currentCoupon);
  // //self.trackCoupon(bestCoupon);


};

////////////////////////////////////////////////////////////////////////////////
//
// @brief when the user press on the "not interested coupon callback"
//
OfferManager.prototype.notInterestedUICallback = function() {
  // TODO: implement here all the needed logic and the
  log('notInterestedUICallback');

  // if the user explicetly says it doesnt want to see the add anymore then
  // we will close it here and everywhere
  //
  let offer = this.cidToOfferMap[this.currentCluster];
  offer = (offer === undefined) ? undefined : this.currentOfferMap[offer];

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
OfferManager.prototype.informationUICallback = function() {
  // TODO: implement here all the needed logic and the
  log('stopBotheringForeverUICallback');

  // avoid closing the notification
  return true;
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief any other type of events from the bar
// @note https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Method/appendNotification#Notification_box_events
//
OfferManager.prototype.extraEventsUICallback = function(reason) {
  // TODO: implement here all the needed logic and the

  log('extraEventsUICallback: ' + reason);

  // check if the current cluster we have an active offer or not, if not then
  // this is being close by the system itself otherwise by the user.
  if (reason === 'removed') {
    let offer = this.cidToOfferMap[this.currentCluster];
    offer = (offer === undefined) ? undefined : this.currentOfferMap[offer];
    const userClosed = (offer !== undefined && offer.active == true);

    log('extraEventsUICallback: userClosed: ' + userClosed);

    // track stats
    if (this.statsHandler) {
      if (userClosed) {
        this.statsHandler.advertiseClosedByUser(offer.appear_on_cid);
      } else {
        this.statsHandler.advertiseClosed(this.currentCluster);
      }
    }

    if (userClosed) {
      // remove the offer
      this.removeAndUntrackOffer(offer.offer_id);
    }
  }
  return true;
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief when an offer is shown
//
OfferManager.prototype.offerShownUICallback = function(offerInfo) {
  // TODO: implement here all the needed logic and the
  log('offerShownUICallback');
  if (!this.userDB) {
    return;
  }
  // get the needed fields
  const clusterID = offerInfo['appear_on_cid'];
  const timestamp = Date.now();

  // for now we will only add the last ad shown for a given cid and timestamp
  this.userDB[clusterID]['last_ad_shown'] = timestamp;

  // track this into stats (telemetry later)
  if (this.statsHandler) {
    this.statsHandler.advertiseDisplayed(offerInfo);
  }
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief when an offer is hiden
//
OfferManager.prototype.offerHideUICallback = function(offerInfo) {
  // we are getting this event already on the extraEventsUICallback...
};












