<div class="cqz-result-h1 ">
{{#with data}}
    {{#with alert}}
        <div class="EZ-weather-alert" style="background-color:{{alert-color}}">
              <img src="{{icon_url}}"/>
             <div class="EZ-weather-alert-info">
                <div class="EZ-weather-alert-info-Line1">{{des}}</div>
                <div class="EZ-weather-alert-info-Line2">{{time}}</div>
            </div>
        </div>
    {{/with}}

    <div class="EZ-weather-bigcontainer">
      <div class='EZ-weather-title'>
           <div class="EZ-weather-city">{{ returned_location }}</div>
           <img  class="EZ-weather_icon" src="{{title_icon}}"/>
       </div>

    <div class='EZ-weather-container'>
      <div class='EZ-weather-date'>{{ todayWeekday }}</div>
       <div class="EZ-weather-img"
               style="background-image:url({{todayIcon}})">
       </div>
       <div class="EZ-weather-temp">
             {{todayTemp}}
             <span style="color:silver"> {{todayMin}} </span>
       </div>
    </div>

    {{#each forecast}}
    <div class='EZ-weather-container'>
         <div class='EZ-weather-date'>{{ weekday }}</div>

         <div class="EZ-weather-img"
               style="background-image:url({{icon}})">
         </div>
         <div class="EZ-weather-temp">
             {{max}}
             <span style="color:#999999"> {{min}} </span>
       </div>
    </div>
    {{/each}}

    <br style="clear:left"/>
    </div>
{{/with}}
    {{>logo}}
</div>
