import LoggingHandler from 'goldrush/logging_handler';

const MODULE_NAME = 'utils';

export function loadFileFromChrome(filePath) {
    var localURL = CliqzUtils.System.baseURL + filePath.join('/');
    return new Promise( (resolve, reject) => {
      CliqzUtils.httpGet( localURL , res => {
        resolve(res.response);
      }, reject );
    });
}
