/*
 * This function handles saving file from url
 */

/* ***** BEGIN LICENSE BLOCK *****
* The MIT License (MIT)
*
* Copyright (c) 2014 gantt
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
* ***** END LICENSE BLOCK ***** */

const{classes:Cc,interfaces:Ci,utils:Cu}=Components;
Cu.import('resource://gre/modules/Services.jsm');

export function saveFileAs (url, filename) {
  let nsIFilePicker = Ci.nsIFilePicker;
  let fp = Cc['@mozilla.org/filepicker;1'].createInstance(nsIFilePicker);
  fp.defaultString = filename;
  let directoryString = null;
  let directory = null;

  fp.displayDirectory = directory;
  let pos = filename.lastIndexOf('.');
  let extension = (pos>-1)?filename.substring(pos+1):'*';
  fp.appendFilter((extension=='m4a')?'Audio':'Video', '*.'+extension);

  var windowMediator = Cc['@mozilla.org/appshell/window-mediator;1'].
  getService(Ci.nsIWindowMediator);
  var window = windowMediator.getMostRecentWindow(null);

  fp.init(window, null, nsIFilePicker.modeSave);
  let fileBox = fp.show();
  try {
    if (fileBox == nsIFilePicker.returnOK || nsIFilePicker.returnReplace) {
      let ioService = Cc['@mozilla.org/network/io-service;1'].
      getService(Ci.nsIIOService);
      let uri = ioService.newURI(url, null , null);
      let fileURI = ioService.newFileURI(fp.file);
      let persist = Cc['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Ci.nsIWebBrowserPersist);
      let xfer = Cc['@mozilla.org/transfer;1'].createInstance(Ci.nsITransfer);
      let privacyContext = window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsILoadContext);
      xfer.init(uri, fileURI, '', null, null, null, persist, false);
      persist.progressListener = xfer;
      try { // Firefox 36+ (new parameter in Firefox 36: aReferrerPolicy)
        persist.saveURI(uri, null, null, 0, null, null, fp.file, privacyContext);
      } catch(e) { // Firefox <36 -> only 7 parameters
        persist.saveURI(uri, null, null, null, null, fp.file, privacyContext);
      }
    }
  } catch(e) { }
}
