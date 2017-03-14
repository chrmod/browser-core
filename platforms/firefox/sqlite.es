Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

const connections = new Map();

export function open(databaseName) {
  let connection;
  if (!connections.has(databaseName)) {
    const filePath = FileUtils.getFile("ProfD", [databaseName]);
    connection = Services.storage.openDatabase(filePath);
    connections.set(databaseName, connection);
  } else {
    connection = connections.get(databaseName);
  }
  return connection;
}

export function close(databaseName) {
  if (!connections.has(databaseName)) {
    return;
  }
  const connection = connections.get(databaseName);
  connection.close();
}

// TODO: remove default export
export default open;
