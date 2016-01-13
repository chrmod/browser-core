<!-- noResult.tpl -->
  {{#with data}}
    <div id="defaultEngine" url="{{searchEngineUrl}}{{searchString}}" class="frame" extra="search" {{#if frameWidth }} style="width: {{ frameWidth }}px; left: {{ left }}px" {{/if}}>
      <div class="ez">
        <div id="googleThisAnim">
          <br>
          <img src="skin/img/icon-google.svg"><br><br>
          <div>{{ title }}</div><br><br>
          <div>{{ action }}</div>
        </div>
      </div>
    </div>
  {{/with}}
<!-- end noResult.tpl -->
