Logger = {

  logCounter: 0,

  log: function(msg,key){ 
    console.log(msg,"[["+key+"]]");
    var logscreen = document.getElementById("logscreen"); 
    if(logscreen) {
      if(!key) {
        key = "";
      }
      var myEl = document.createElement("tr");
      Logger.logCounter++;
      myEl.style.backgroundColor = Logger.logCounter%2==0 ? "#fff":"#efefef";
      myEl.innerHTML = "<td style='color:green;width:50px'>"+key+"</td><td>"+msg+"</td>";
      logscreen.insertBefore(myEl, logscreen.firstChild);
    } 
    
  }
}