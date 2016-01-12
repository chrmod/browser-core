<!-- noResult.tpl -->
  {{#with data}}
    <div url="{{searchEngineUrl}}{{searchString}}" class="frame" extra="search" {{#if frameWidth }} style="width: {{ frameWidth }}px; left: {{ left }}px" {{/if}}>
      <div class="ez">
        <div id="googleThisAnim">
            <br>
            <img src="skin/img/icon-google.svg"><br><br>
           <div><br>Nichts gefunden?<br><br>Hier tappen für Ergebnisse von {{searchEngineName}}<br><br></div>
        </div>
      </div>
    </div>
  {{/with}}
<!-- end noResult.tpl -->