import LoggingHandler from 'goldrush/logging_handler';
// fids
import { TopHourFID }  from 'goldrush/fids/top_hour_fid';
import { TopClusterVisitsFID } from 'goldrush/fids/top_cluster_visits_fid';
import { SignalDetectedFilterFID } from 'goldrush/fids/signal_detected_filter_fid';
import { CheckoutDetectedFilterFID } from 'goldrush/fids/checkout_detected_filter_fid';


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
    case 'topHour':
      fid = new TopHourFID();
      break;
    case 'topClusterVisits':
      fid = new TopClusterVisitsFID();
      break;
    case 'signalDetectedFilter':
      fid = new SignalDetectedFilterFID();
      break;
    case 'checkoutDetectedFilter':
      fid = new CheckoutDetectedFilterFID();
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



