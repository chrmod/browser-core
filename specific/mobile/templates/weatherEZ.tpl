
<div class="meta">
    {{> logo}}
    <h3 class="meta__url">
        <span>{{ returned_location }}</span></h3>
</div>

<div class="cqz-result-h2 ez-weather cqz-ez-black-title main weather">
    {{#with data}}

        <div class='EZ-weather-container'>
            <div class='main__headline'>{{ todayWeekday }}</div>
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
</div>