<!-- noResult.tpl -->
{{#with data}}
<div url="http://www.google.com/#q={{uriEncode searchString}}" class="frame" {{#if frameWidth }} style="width: {{ frameWidth }}px; left: {{ left }}px" {{/if}}>
  <div class="ez">
    <div id="googleThisAnim">
          <br>
          <img src="skin/img/icon-google.svg"><br><br>
           <a href="">Leider kein passendes Ergebnis gefunden? <br><br>Hier tappen und wir checken mal Google für dich...<br><br></a>
        </div>
  </div>
</div>
{{/with}}
<!-- end noResult.tpl -->