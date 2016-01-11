<!-- noResult.tpl -->
  {{#with data}}
    <div url="{{searchEngineUrl}}{{searchString}}" class="frame" extra="search" {{#if frameWidth }} style="width: {{ frameWidth }}px; left: {{ left }}px" {{/if}}>
      <div class="ez">
        <div id="googleThisAnim">
            <br>
            <img src="skin/img/icon-google.svg"><br><br>
           <div>Leider kein passendes Ergebnis gefunden? <br><br>Hier tappen und wir checken mal {{searchEngineName}} für dich...<br><br></div>
        </div>
      </div>
    </div>
  {{/with}}
<!-- end noResult.tpl -->