

// TODO: configure all this values before the release
////////////////////////////////////////////////////////////////////////////////



var GoldrushConfigs = {

  //////////////////////////////////////////////////////////////////////////////
  // GLOBAL
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 60 * 60 * 24,

  CURRENT_VERSION: 0.2,

  //////////////////////////////////////////////////////////////////////////////
  // Logging system

  // nasty approach to "simulate macros :("
  LOG_ENABLED: true,

  //////////////////////////////////////////////////////////////////////////////
  // Offer Manager

  // the number of milliseconds we want to wait till we hide the add
  HIDE_OFFER_MS: 600 * 1000,
  // the session threshold time in secs (this will split the sessions for the
  // intent input system)
  INTENT_SESSION_THRESHOLD_SECS: 60 * 30,
  // the buying intent threshold time in secs (this will split different buying
  // intention sessions)
  BUY_INTENT_SESSION_THRESHOLD_SECS: 60 * 60 * 24 * 10,

  // the flag indicating if we should load the history or not
  LOAD_HISTORY_EVENTS: false, // TODO: set it to true

  // how many days / hours of history we should load into the system to feed
  // the intent input system
  HISTORY_EVENTS_TIME_DAYS: 10,

  // get the global flag if we need to switch or not
  OFFER_SUBCLUSTER_SWITCH: true,

  // the redirect url to where we should point to when the user sees the offer
  // and click on "more info"
  // TODO: define this url to the correct place.
  OFFER_INFORMATION_URL: 'https://cliqz.com/products/cliqz-for-desktop/cliqz-angebote',

  //////////////////////////////////////////////////////////////////////////////
  // Offer Fetcher

  OFFER_FETCHER_DEST_URL: 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=vouchers.cliqz.com&',

  //////////////////////////////////////////////////////////////////////////////
  // Stats handler

  // how often we want to push the stats to the backend
  STATS_SENT_PERIODISITY_MS: 1000 * 20, // 1000 * (60 * 60 * 24);
  // the local storage file path to store the stats
  STATS_LOCAL_STORAGE_URL: 'chrome://cliqz/content/goldrush/stats_db.json',

  //////////////////////////////////////////////////////////////////////////////

  // store user stats
  USER_LOCAL_STORAGE_URL: 'chrome://cliqz/content/goldrush/user_db.json',

  // coupon information storage
  COUPONS_DATA_LOCAL_STORAGE_URL: 'chrome://cliqz/content/goldrush/coupons_data.json',
  // coupon handler load old data (TODO: change this in the release to true)
  COUPON_HANDLER_LOAD_FILE_FLAG: false,

  // offer fetcher temp cache
  TS_THRESHOLD: 1000 * 60

};


export default GoldrushConfigs;
