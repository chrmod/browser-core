

let ops = {};

/**
 * send a signal to the BE, always associated to an offer.
 * @param  {String} offerID The associated offer ID
 * @param  {String} actionID Is the signal name (key) to be sent
 * @return {String} campaignID The associated campaign ID of the offer.
 * @todo This method will change soon and maybe the interface.
 * @version 1.0
 */
function send_signal(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 3) {
      reject(new Error('invalid args'));
      return;
    }

    var offerId = args[0];
    var key = args[1];
    var capmaignId = args[2];

    eventLoop.environment.sendSignal(capmaignId, offerId, key);

    resolve();
  });
};


ops['$send_signal'] = send_signal;

export default ops;
