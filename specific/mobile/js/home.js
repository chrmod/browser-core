console.log("localStorage", localStorage);
if(localStorage.length == 0) {
  window.addEventListener('load', function() {
    window.document.getElementById('freshstart').innerHTML = '<h1 class="main__headline">Willkommen <br>beim CLIQZ-Browser!</h1>';
  });
}