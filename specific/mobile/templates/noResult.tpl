<!-- noResult.tpl -->
  {{#with data}}
    <div id="defaultEngine" url="{{searchEngineUrl}}{{searchString}}" extra="search" {{#if frameWidth }} style="width: {{ frameWidth }}px; left: {{ left }}px" {{/if}}>
      <div class="ez">
        <div id="googleThisAnim">
          <img src="skin/img/icon-google.svg"><br>
          <div>{{ title }}</div><br>
          <div id="noResults">{{ action }}</div>
        </div>
      </div>
    </div>
  {{/with}}
<!-- end noResult.tpl -->
