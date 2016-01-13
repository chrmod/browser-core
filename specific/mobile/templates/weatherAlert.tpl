
<!-- weatherAlert.tpl -->

<div class="meta">
    {{> logo}}
    {{#with data}}
    <h3 class="meta__url">
        <span>{{ returned_location }}</span></h3>
</div>

<div class="cqz-result-h2 ez-weather cqz-ez-black-title weather">

        {{#with alert}}
            <div class="alert" style="background-color:{{alert-color}};padding:5px">
                <div class="header" style="font-size:14px">{{des}}</div>
                <div class="info" style="font-size:10px"">{{time}}</div>
            </div>
        {{/with}}

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
{{/with}}
<!-- end weatherAlert.tpl -->
