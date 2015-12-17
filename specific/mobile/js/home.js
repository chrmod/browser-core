console.log("localStorage", localStorage);
if(localStorage.length == 0) {
  window.addEventListener('load', function() {
    window.document.getElementById('freshstart').innerHTML = 'HELLO';

  });
}