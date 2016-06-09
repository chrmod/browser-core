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
import {UIManager} from 'goldrush/ui/ui_manager';

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
    'save_coupon': this.saveCouponUICallback.bind(this),
    'not_interested': this.notInterestedUICallback.bind(this),
    'information': this.informationUICallback.bind(this),
    'extra_events': this.extraEventsUICallback  .bind(this)
  });

  this.userDB = null;


  // subscribe to the

  // the cluster information

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
  // TODO: maybe if we need to destroy something
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will format an event into the struct we need to call the
//        intent input.
//        will return null if the event is not related with any cluster.
// @note check the intent input to see which is the expected format
//
OfferManager.prototype.formatEvent = function(originalURL) {
  log('formatEvent');
  if (!this.mappings) {
    return null;
  }


  // we need to detect if we are in a domain of some cluster.
  const domainName = originalURL['name'];
  const domainID = this.mappings['dname_to_did'][domainName];
  log('domainName' + domainName);
  log('domainID' + domainID);
  if (!domainID) {
    // skip this one
    return null;
  }

  // TODO: get all the fields we need here.

  const fullURL = originalURL['domain'] + originalURL['path'] ;
  // This is how the other modules at cliqz does it
  const timestamp = Date.now();
  // check if we are in a checkout page?
  const checkoutFlag = this.isCheckoutPage(fullURL);
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

////////////////////////////////////////////////////////////////////////////////
//
// @brief this method should be called everytime we show an add for a given domain
//        in a given cluster and the associated url + timestamp
//
OfferManager.prototype.addShown = function(clusterID, domainID, timestamp) {
  if (!this.userDB) {
    return;
  }

  // for now we will only add the last ad shown for a given cid and timestamp
  this.userDB[clusterID]['last_ad_shown'] = timestamp;
};


////////////////////////////////////////////////////////////////////////////////
//                          PUBLIC INTERFACE
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will evaluate a new event from the user.
//        Here we will get a specific value for the given event and we should do
//        all the logic of showing a coupong if our system detects a coupon or not.
//
OfferManager.prototype.processNewEvent = function(urlObject) {
  // TODO for now we will use a url event (asses), we can add or get extra
  //      information in this method an use it

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
  var event = this.formatEvent(urlObject);
  log('event' + JSON.stringify(event, null, 4));
  if (!event) {
    // we skip this event.
    log('skipping event has domain relevant');
    return;
  }

  // get the associated cluster
  const domainName = this.mappings['did_to_dname'][event['domain_id']];
  const clusterID = this.mappings['dname_to_cid'][domainName];
  if (!clusterID || clusterID < 0) {
    // this cannot happen since we got a valid domainID from the mappings but
    // we don't have the given cluster ID in the mappings? this is not gut
    log('ERROR: invalid cluster id!: ' + domainName);
    return;
  }

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

  // we have an intention so we need to get the coupons from the fetcher
  if (!this.offerFetcher) {
    log('WARNING: we dont have still the offerFetcher, we then skip this event?');
    return;
  }

  var self = this;
  this.offerFetcher.checkForCouponsByCluster(0, function(vouchers) {
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

    // we have a cluster, show it into the UI for the user
    if (!self.uiManager.addCoupon(bestCoupon)) {
      // nothing else to do...
      return;
    }

    // (9) we need to track it on the callback of the button since the user
    //     can cancel the coupon -> we don't care about it.

    // we call this method to notify that we just show an ad
    self.addShown(clusterID, event['domain_id'], Date.now());
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

  // track it (get the current coupon from the ui manager)
  this.uiManager.showCouponInfo(this.uiManager.getCurrentCoupon());
  //self.trackCoupon(bestCoupon);
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief when the user press on the "save coupon callback"
//
OfferManager.prototype.saveCouponUICallback = function() {
  // TODO: implement here all the needed logic and the
  log('saveCouponUICallback');
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief when the user press on the "not interested coupon callback"
//
OfferManager.prototype.notInterestedUICallback = function() {
  // TODO: implement here all the needed logic and the
  log('notInterestedUICallback');
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
// @brief flag is the user is on a checkout page
//
OfferManager.prototype.isCheckoutPage = function(url) {
  // TODO implement this
  // if (this.mappings['dname_to_checkout_regex']){
  //   log('checkoutFlag' + JSON.stringify(this.mappings['dname_to_checkout_regex']));
  //   return true;
  // }
  return false;
};

////////////////////////////////////////////////////////////////////////////////
//
// @brief any other type of events from the bar
// @note https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Method/appendNotification#Notification_box_events
//
OfferManager.prototype.extraEventsUICallback = function(reason) {
  // TODO: implement here all the needed logic and the
  log('extraEventsUICallback: ' + reason);
};

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













