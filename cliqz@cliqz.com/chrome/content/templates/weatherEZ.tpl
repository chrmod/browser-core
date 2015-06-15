<div class="cqz-result-h2 ez-weather cqz-ez-black-title">
    {{#with data}}
  <div class='cqz-ez-title' arrow-override=''><a href="{{../url}}">{{ returned_location }}</a></div>

        <div class='EZ-weather-container'>
            <div class='EZ-weather-date'>{{ todayWeekday }}</div>
            <div class="EZ-weather-img" style="background-image:url({{todayIcon}})"></div>
            <div class="EZ-weather-temp">{{todayTemp}}<span>{{todayMin}}</span></div>
        </div>

        {{#each forecast}}
            <div class='EZ-weather-container'>
                 <div class='EZ-weather-date'>{{ weekday }}</div>
                 <div class="EZ-weather-img" style="background-image:url({{icon}})"></div>
                 <div class="EZ-weather-temp">{{max}}<span>{{min}}</span>
               </div>
            </div>
        {{/each}}
    {{/with}}

    {{>logo}}
</div>