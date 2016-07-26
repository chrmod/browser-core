// var sample_message = {"action": "alive","mode":"safe", "type": "humanweb", "ver": "1.5", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"};

/*
chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
	if (request.getTargetData)
		{
			sendResponse({targetData: "ss"})
      	}
    else if (request.activateLasers) {
      var success = activateLasers();
      sendResponse({activateLasers: success});
    }
  });


  // For long-lived connections:
chrome.runtime.onConnectExternal.addListener(function(port) {
  port.onMessage.addListener(function(request) {
  	// alert(msg.question);
  	// port.postMessage({"reply":"pong"});
	function reqListener() {
	  // var data = JSON.parse(this.responseText);
	  // console.log(data);
	  var t2 = Date.now()
	  console.log("Request timing: " + (t2-t1)/1000);
	  port.postMessage({"reply":"pong"});

	}

	function reqError(err) {
	  console.log('Fetch Error :-S', err);
	}

	var t1 = Date.now();
	var oReq = new XMLHttpRequest();
	oReq.onload = reqListener;
	oReq.onerror = reqError;
	oReq.open('get', request.url, true);
	oReq.send();
	return true;
  });
});
*/