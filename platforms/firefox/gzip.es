// String compression used Firefox API.
// Based on https://gist.github.com/Endyl/c12438b6e68bbca1bab5
const CC = Components.Constructor;
const Ci = Components.interfaces;
const Cc = Components.classes;

const UncompressConverter = CC(
  '@mozilla.org/streamconv;1?from=gzip&to=uncompressed',
  'nsIStreamConverter',
  'asyncConvertData');
const CompressConverter = CC(
  '@mozilla.org/streamconv;1?from=uncompressed&to=gzip',
  'nsIStreamConverter',
  'asyncConvertData');
const StringInputStream = CC(
  '@mozilla.org/io/string-input-stream;1',
  'nsIStringInputStream');

/**
 * For request simulation
 */
function Accumulator() {
  this.buffer = [];
};
Accumulator.prototype = {
  buffer: null,
  onStartRequest: function(aRequest, aContext) {},
  onStopRequest: function(aRequest, aContext, aStatusCode) {},
  onDataAvailable: function(aRequest, aContext, aInputStream, aOffset, aCount) {
    var stream, input;

    stream = Cc["@mozilla.org/binaryinputstream;1"].
      createInstance(Ci.nsIBinaryInputStream);
    stream.setInputStream(aInputStream);

    input = stream.readByteArray(aCount);

    this.buffer = this.buffer.concat(input);
  }
};

function simulateRequest(aConverter, aStream, aContentLength) {
  aConverter.onStartRequest(null, null);
  aConverter.onDataAvailable(null, null, aStream, 0, aContentLength);
  aConverter.onStopRequest(null, null, 201 /* 417 */);
}

function compressString(aString) {
  var accumulator,
      converter,
      stream;

  accumulator = new Accumulator();
  converter = new CompressConverter('uncompresssed', 'gzip', accumulator, null);
  stream = new StringInputStream();
  stream.data = aString;
  simulateRequest(converter, stream, aString.length);

  return Uint8Array.from(accumulator.buffer);
}

function uncompressString(aString) {
    var accumulator,
        converter,
        stream;

    accumulator = new Accumulator();
    converter = new UncompressConverter('gzip', 'uncompressed', accumulator, null);
    stream = new StringInputStream();
    stream.data = String.fromCharCode.apply(null, aString);
    simulateRequest(converter, stream, aString.length);

    return String.fromCharCode.apply(null, accumulator.buffer);
  }

export function compress(string) {
  return compressString(string);
};

export function decompress(data) {
  return uncompressString(data);
};
