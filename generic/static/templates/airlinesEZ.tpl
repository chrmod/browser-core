<div class="cqz-result-h2 EZ-airlines-bigcontainer">
{{#with data}}

  <div class='EZ-airlines-title'>
      <span class="EZ-airlines-name">{{ name }}</span>
      <img  class="EZ-airlines-name_icon" src="{{name_icon}}"/>
  </div>

  {{#with first_tile}}
     <div class="EZ-airlines-firstTile">
        {{#each sub-tiles}}
            <div class="EZ-airlines-firstTile-smallTile" style="background-color:{{tile_color}}" url="{{url}}">
               <div class="EZ-airlines-center-vertical_text">{{label}}</div>
            </div>
            <div class="EZ-airlines-firstTile-smallTile_padding"></div>
        {{/each}}
     </div>
  {{/with}}

  {{#each small_tiles}}
      <div class="EZ-airlines-Tiles" url="{{url}}">
           <div class="EZ-airlines-Tiles_icon"
                   style="background-image: url({{icon}})">
            </div>
            <div class="EZ-airlines-Tiles_text">{{label}}</div>
     </div>
  {{/each}}
<br style="clear:left"/>
{{/with}}
    {{>logo}}
</div>
