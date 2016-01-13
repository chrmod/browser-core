<!-- weatherEZ.tpl -->

<div class="meta">
    {{> logo}}
    {{#with data}}
    <h3 class="meta__url">
        <span>{{ returned_location }}</span></h3>
</div>

<div class="cqz-result-h2 ez-weather cqz-ez-black-title weather">


        <div class='EZ-weather-container weather__today'>
            <div class='EZ-weather-date'>{{ todayWeekday }}</div>
            <div class="EZ-weather-temp">{{todayTemp}}<br><span>{{todayMin}}</span></div>
            <div class="EZ-weather-img" data-style="background-image:url({{todayIcon}})"></div>

        </div>

        {{#each forecast}}
            {{#if (limit_images_shown @index 3)}}
                <div class='EZ-weather-container'>
                    <div class="EZ-weather-img" data-style="background-image:url({{icon}})"></div>
                    <div class='EZ-weather-date'>{{ weekday }}</div>
                    <div class="EZ-weather-temp">{{max}}<br><span>{{min}}</span>
                   </div>
                </div>
            {{/if}}

        {{/each}}

</div>

<div class="poweredby">
    More details at <a href="http://www.weatherunderground.com">weatherunderground.com</a>
</div>

{{/with}}
<!-- end weatherEZ.tpl -->
