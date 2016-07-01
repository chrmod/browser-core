import LoggingHandler from 'goldrush/logging_handler';
// fids
import { TopHourFID }  from 'goldrush/fids/top_hour_fid';
import { TopClusterVisitsFID } from 'goldrush/fids/top_cluster_visits_fid';
import { SignalDetectedFilterFID } from 'goldrush/fids/signal_detected_filter_fid';
import { CheckoutDetectedFilterFID } from 'goldrush/fids/checkout_detected_filter_fid';
import { HourFID } from 'goldrush/fids/hour_fid';
import { DayFID } from 'goldrush/fids/day_fid';
import { SessionCountFID } from 'goldrush/fids/session_count';
import { NumEventsCurrSessionFID } from 'goldrush/fids/num_events_curr_session';


const MODULE_NAME = 'fids_builder';


////////////////////////////////////////////////////////////////////////////////
export class FIDsBuilder {
  constructor() {
  }

  //
  // @brief Build a new fid from the id name
  // @return a new instance of that FID type || null on error
  //
  buildFID(fidIDName) {

    var fid = null;
    switch (fidIDName) {
    case 'topClusterVisits':
      fid = new TopClusterVisitsFID();
      break;
    case 'signalDetectedFilter':
      fid = new SignalDetectedFilterFID();
      break;
    case 'checkoutDetectedFilter':
      fid = new CheckoutDetectedFilterFID();
      break;
    case 'hour':
      fid = new HourFID();
      break;
    case 'day':
      fid = new DayFID();
      break;
    case 'sessionCount':
      fid = new SessionCountFID();
      break;
    case 'numEventsCurrSession':
      fid = new NumEventsCurrSessionFID();
      break;
    default:
      // nothing to do
      break;
    }
    if (!fid) {
      LoggingHandler.error(MODULE_NAME, 'We dont have the fid for name: ' + fidIDName);
    }

    // TODO: init or whatever we need
    return fid;
  }


}



