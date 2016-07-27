var additionalInfo = {
  "title": document.title,
  "html": document.getElementsByTagName('html')[0].innerHTML
};

chrome.runtime.connect().postMessage(additionalInfo);