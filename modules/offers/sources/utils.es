import LoggingHandler from 'offers/logging_handler';
import { utils } from 'core/cliqz';

const MODULE_NAME = 'utils';


function loadFileFromChrome(filePath) {
    var localURL = utils.System.baseURL + filePath.join('/');
    return new Promise( (resolve, reject) => {
      utils.httpGet( localURL , res => {
        resolve(res.response);
      }, reject );
    });
}

function isCLIQZBrowser(settings) {
  return settings.channel === "40";
}

export {
  loadFileFromChrome,
  isCLIQZBrowser
};
