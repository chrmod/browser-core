

// TODO: configure all this values before the release
////////////////////////////////////////////////////////////////////////////////



var GoldrushConfigs = {

  //////////////////////////////////////////////////////////////////////////////
  // GLOBAL
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 60 * 60 * 24,

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
  // TODO: this we can read it from the pref CliqzUtils.getPref(OM_AB_SUBC_SWITCH_KEY, true);
  OFFER_SUBCLUSTER_SWITCH: true,

  // the redirect url to where we should point to when the user sees the offer
  // and click on "more info"
  // TODO: define this url to the correct place.
  OFFER_INFORMATION_URL: 'https://cliqz.com/aboutus/team',


  //////////////////////////////////////////////////////////////////////////////
  // Stats handler

  // how often we want to push the stats to the backend
  STATS_SENT_PERIODISITY_MS: 1000 * 3000, // 1000 * (60 * 60 * 24);
  // the local storage file path to store the stats
  STATS_LOCAL_STORAGE_URL: 'chrome://cliqz/content/goldrush/stats_db.json',

  // offer fetcher temp cache
  TS_THRESHOLD: 1000 * 60

};


export default GoldrushConfigs;
