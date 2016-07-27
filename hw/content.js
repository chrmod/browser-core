var additionalInfo = {
  "type": "dom",
  "title": document.title,
  "html": document.getElementsByTagName('html')[0].innerHTML
};

var signal = {};
signal["type"] = "event_listener";

chrome.runtime.connect().postMessage(additionalInfo);

window.onkeypress = function(e){
	signal["action"] = "keypress";
	chrome.runtime.connect().postMessage(signal);
}

window.onmousemove = function(e){
	signal["action"] = "mousemove";
	chrome.runtime.connect().postMessage(signal);
}

window.onmousedown = function(e){
	signal["action"] = "mousedown";
	chrome.runtime.connect().postMessage(signal);
}

window.onscroll = function(e){
	signal["action"] = "scroll";
	chrome.runtime.connect().postMessage(signal);
}

window.oncopy = function(e){
	signal["action"] = "copy";
	chrome.runtime.connect().postMessage(signal);
}
