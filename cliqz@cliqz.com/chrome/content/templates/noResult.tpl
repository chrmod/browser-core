{{#with data}}
<div class="cqz-result-h1">
  <div class="EZ-noResult-title">
     <div class="EZ-noResult-title-H1">{{text_line1}}</div>
     <span class="EZ-noResult-title-H2">{{text_line2}}</span>
  </div>

  <div class="EZ-noResult-logos" id="EZ-noResult-logos" cliqz-action="alternative-search-engine">
     {{#each search_engines}}
      <div class="EZ-noResult-one-logo" style="background-color:{{background-color}}" engine="{{name}}" engineCode="{{code}}">
          <div style="background-image: url({{logo}})"></div>
      </div>
     {{/each}}
  </div>
  <div class="EZ-noResult-bottom-logo">
     <img class="EZ-noResult-Cliqz-logo" src="{{cliqz_logo}}"/>
  </div>

  <br style="clear:left"/>
</div>
{{/with}}

