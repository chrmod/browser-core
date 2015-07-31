<div class="cqz-result-h2 cqz-result-padding">
 
 <div align="left">
{{ data.name}} - {{ data.trackid }} <img src="http://cdn.cliqz.com/extension/EZ/shipping/dhl/box.png" />
 </div>
  <div>

    {{#each data.links}}
      <div
        class="cqz-ez-search-app"
        style="background-color: white;
                   background-image: url({{this.icon_url}});
                   background-size: auto"
        url="{{this.url}}"
        extra="item-{{this.logg_as}}"
        >
      </div>
    {{/each}}

    <img src="{{data.logo}}" align="right" />
  </div>
  <div >
  {{ data.status }}<br />
  {{ data.date }}<br />
  {{ data.message }}
  </div>
  
 
  {{>feedback}}
</div>