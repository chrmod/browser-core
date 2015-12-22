Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

var dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbattrack"]));
export default dbConn;
