// not available in older FF versions
try {
  Components.utils.import("resource://gre/modules/osfile.jsm");
} catch(e) { }

function getFullPath(filePath) {
  if ( !(filePath instanceof Array) ) {
    filePath = [filePath];
  }
  return OS.Path.join(OS.Constants.Path.profileDir, ...filePath);
}

export function readFile(filePath) {
  let path = getFullPath(filePath);

  return OS.File.read(path);
}

export function writeFile(filePath, data) {
  let path = getFullPath(filePath);

  return OS.File.writeAtomic(path, data);
}

export function mkdir(path) {
  return OS.File.makeDir(path, { ignoreExisting: true });
}
