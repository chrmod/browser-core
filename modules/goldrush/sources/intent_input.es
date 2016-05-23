import { utils } from 'core/cliqz';
//import Reporter from 'goldrush/reporter';
//import ResourceLoader from 'core/resource-loader';

var assert = require('assert');


function log(s){
  utils.log(s, 'GOLDRUSH - II');
}


////////////////////////////////////////////////////////////////////////////////
export function IntentInput(sessionTimeSecs = 30*60) {
  // internal structures to be filled in with user events
  this. buyAction = [];
  this.sessions = [];
  this.rawActivity = [];
  this.currentSessionsEvents = [];
  this.currentBuyAction = [];
  // helper variables
  this.currentEventID = 0;
  this.currentSessionID = 0;
  this.lastBuyEventIndex = -1;
  // seconds between sessions?
  this.sessionTimeSecs = sessionTimeSecs;
  // needed for filtering
  this.isNewEvent = true;
};

//
// @brief This method should be called whenever we got a new event or when we
//        read events from the past.
// @param event This event is a structure (object) with the following elements:
//        event_type: event type (we need to define which ones we will have if we have)
//        full_url: the full url of the event (landing url?)
//        ts: the timestamp of the event.
//        domain_id: the domain ID within the cluster.
//        checkout_flag: if the url matches to one of the regex on the cluster.
//        last_url: where the user was before.
//        referrer_url: if there are any referrer to this event.
//        extra: the extra information we want to add (TO BE DEFINED)
//        id: will be filled in in this function
//
IntentInput.prototype.feedWithEvent = function(event) {
  assert(event['event_type'] !== undefined);
  assert(event['full_url'] !== undefined);
  assert(event['ts'] !== undefined);
  assert(event['domain_id'] !== undefined);
  assert(event['checkout_flag'] !== undefined);
  assert(event['last_url'] !== undefined);
  assert(event['referrer_url'] !== undefined);
  assert(event['extra'] !== undefined);

  event['id'] = this.currentEventID++;
  this.rawActivity.push(event);
  this.isNewEvent = true;

  if (this.currentSessionsEvents.length === 0) {
    // we just need to add this and return
    this.currentSessionsEvents.push(event);
    return;
  }

  // check if there is a new session or still in the last
  assert(this.rawActivity.length >= 2);
  let lastEvent = this.rawActivity[this.rawActivity.length - 2];
  let timeDiff = event['ts'] - lastEvent['ts'];
  assert(timeDiff >= 0);
  if (timeDiff === 0) {
    // skip this one? duplicated, cannot be...
    this.isNewEvent = false;
    return;
  }

  // check if the user bought
  if (event.checkout_flag) {
    this.lastBuyEventIndex = event.id;
  }

  if (timeDiff >= this.sessionTimeSecs) {
    // it is a new session
    this.sessions.push(this.currentSessionsEvents);
    this.currentBuyAction.push(this.currentSessionsEvents);

    // check if the we have to buy in the last session
    let sessionEvtBegIndex = this.currentEventID - this.currentSessionsEvents.length + 1;
    if (this.lastBuyEventIndex >= sessionEvtBegIndex) {
      // we buy in this session, so we need to add this and clear the lists
      this.buyAction.push(this.currentBuyAction);
      this.currentBuyAction = [];
    }
    this.currentSessionsEvents = [];
    this.currentSessionID += 1;
    this.currentSessionsEvents.push(event);
    return;
  }

  // this is an old session
  this.currentSessionsEvents.push(event);

};




