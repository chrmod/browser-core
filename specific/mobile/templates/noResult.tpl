<!-- noResult.tpl -->
{{#with data}}
<div url="http://www.google.com/#q={{searchString}}" class="frame" {{#if frameWidth }} style="width: {{ frameWidth }}px; left: {{ left }}px" {{/if}}>
  <div class="ez">
    <div id="googleThisAnim">
      <ul class="cta">
        <li>
          <a href="" style="text-align: center; line-height: 1.25; padding: 6px 12px 12px"><i class="fa fa-search" style="font-size: 24px; margin: 6px 0"></i><br>Einfach hier tappen <br>für Google-Suche</a>
        </li>
    </div>
  </div>
</div>
{{/with}}
<!-- end noResult.tpl -->