
window.addEventListener("message", function(ev){
  var data = JSON.parse(ev.data);
  if(data.target == 'cliqz-control-center' &&
     data.origin == 'window'){
    messageHandler(data.message)
  }
});


function sendMessageToWindow(message){
  window.postMessage(JSON.stringify({
    target: 'cliqz-control-center',
    origin: 'iframe',
    message: message
  }), '*');
}

function messageHandler(message){
  console.log("MESSAGE in IFRAME", message);
}

sendMessageToWindow({ action: "getData", data: {} });

// debug data
setInterval(sendMessageToWindow, 10000, { action: "getData", data: {} })
