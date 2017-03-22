

var ops = {};
export default ops;


ops['$send_signal'] = function(args, eventLoop) {
  return new Promise((resolve, reject) => {
    if(args.length < 3) {
      reject(new Error('invalid args'));
    }

    var capmaignId = args[0];
    var offerId = args[1];
    var key = args[2];

    eventLoop.environment.sendSignal(capmaignId, offerId, key);

    resolve();
  });
};
