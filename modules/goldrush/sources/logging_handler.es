// TODO maybe we need to move this logic to the higher level like writeFile in the
// fs (core cliqz fs).
try {
  Components.utils.import('resource://gre/modules/osfile.jsm');
} catch(e) { }
// to log in console
import { utils } from 'core/cliqz';

////////////////////////////////////////////////////////////////////////////////



var LoggingHandler = {
  //////////////////////////////////////////////////////////////////////////////
  // GLOBAL FLAGS
  //
  SAVE_TO_FILE: true, // TODO this should be disabled before release
  LOG_FILE_NAME: ['cliqz', 'goldrush', 'logging.log'], // TODO define here


  //////////////////////////////////////////////////////////////////////////////
  // DEFINE THE ERROR CODES HERE
  //
  // no error
  ERR_NONE: 0,
  // unknown error (something very bad)
  ERR_INTERNAL: 1,
  // Backend error
  ERR_BACKEND: 2,
  // reading / writing error (local files)
  ERR_IO: 3,
  // JSON parsing error
  ERR_JSON_PARSE: 4,
  ERR_FILE_PARSE: 5,
  ERR_RULE_FILE: 6,




  //////////////////////////////////////////////////////////////////////////////
  //

  init() {
    // create the createWriteStream into a variable
    this.fileObj = null;
    // get the full path
    var self = this;
    if (LoggingHandler.SAVE_TO_FILE) {
      const filePath = OS.Path.join(OS.Constants.Path.profileDir, ...LoggingHandler.LOG_FILE_NAME);

      // check https://developer.mozilla.org/es/docs/Mozilla/JavaScript_code_modules/OSFile.jsm/OS.File_for_the_main_thread#Example: Append to File
      OS.File.exists(filePath).then(exists => {
        if (!exists) {
          OS.File.open(filePath, {create: true}).then(fileObject => {
            self.fileObj = fileObject;
          }).catch(function(ee){
            utils.log('error creating the file that doesnt exists: ' + ee, '[goldrush]');
          });
        } else {
          OS.File.open(filePath, {write: true, append: true}).then(fileObject => {
            self.fileObj = fileObject;
          });
        }
      });


    }

  },

  uninit() {
    if (this.fileObj) {
      this.fileObj.flush();
      this.fileObj.close();
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  doLogging(messageType, moduleName, message, errorCode = LoggingHandler.ERR_NONE) {
    // TODO: build the string we want to log in the proper format
    var strToLog = '[goldrush][' + messageType + '][' + moduleName +']';
    if (errorCode !== LoggingHandler.ERR_NONE) {
      strToLog += '[ErrCode: ' + errorCode + ']: ';
    } else {
      strToLog += ': ';
    }
    strToLog += message + '\n';

    // log in the file if we have one
    if (this.fileObj) {
      this.fileObj.write(new TextEncoder().encode(strToLog)).catch(function(ee) {
        // TODO: try to re open it here?
        utils.log('error logging to the file! something happened?: ' + ee, '[goldrush]');
      });
    }
    // log to the console
    utils.log(strToLog, '');
  },

  //////////////////////////////////////////////////////////////////////////////
  //                            "PUBLIC" METHODS
  //////////////////////////////////////////////////////////////////////////////

  // 3 function (one per error/log level)
  // - error()
  // - warning()
  // - info().


  error(moduleName, message, errorCode = LoggingHandler.ERR_NONE) {
    LoggingHandler.doLogging('error', moduleName, message, errorCode);
  },

  warning(moduleName, message, errorCode = LoggingHandler.ERR_NONE) {
    LoggingHandler.doLogging('warning', moduleName, message, errorCode);
  },

  info(moduleName, message) {
    LoggingHandler.doLogging('info', moduleName, message);
  },

};


export default LoggingHandler;
