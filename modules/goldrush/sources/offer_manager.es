import { utils } from 'core/cliqz';
import ResourceLoader from 'core/resource-loader';


function log(s){
  utils.log(s, 'GOLDRUSH - OFFER MANAGER');
};

// TODO: remove this and the usage of this method
//
function check(expression, message) {
  if (!expression) {
    log(message);
  }
}

////////////////////////////////////////////////////////////////////////////////
function parseMappingsFile(filename, varToSet) {
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

    varToSet = json;
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

}

////////////////////////////////////////////////////////////////////////////////
//
// @brief create the FIDS map (fid name -> FID object) from a list of names
//
function generateFidsMap(fidsNamesList) {
  // TODO: return the map fid_name -> fid instance
}

////////////////////////////////////////////////////////////////////////////////
//
// @brief generate a list of databases from db_name to db instance (from a list of names)
//
function generateDBMap(dbsNamesList) {
  // TODO:
}

////////////////////////////////////////////////////////////////////////////////
//
// @brief This class will be in charge of handling the offers and almost everything
//        else. This is the main class.
//
export function OfferManager() {
  // the mappings we will use
  this.mappings = null;
  // the cluster information


  parseMappingsFile('mappings.json', this.mappings);

  // load the clusters and create the
  let clusterFilesMap = getClustersFilesMap();

}

////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will generate the intent detection system with the current
//        data we have. It will load all the intent detector and also generate
//        the map from cluster_id -> intent_detector.
//
OfferManager.prototype.generateIntentsDetector = function() {
  // TODO
};


////////////////////////////////////////////////////////////////////////////////
//
// @brief this method will evaluate a new event from the user.
//        Here we will get a specific value for the given event and we should do
//        all the logic of showing a coupong if our system detects a coupon or not.
//
OfferManager.prototype.processNewEvent = function(url) {
  // TODO for now we will use a url event (asses), we can add or get extra
  //      information in this method an use it
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

  // TODO: this method will check a map: url_domain -> url_regex
  //       to check if we are on the site where each url_domain has associated a
  //       coupon (active ones).
};








