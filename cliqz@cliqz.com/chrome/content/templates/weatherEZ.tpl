<div class="cqz-result-h2 ez-weather cqz-ez-black-title">

    {{#with data}}
        <div class='cqz-ez-title' arrow-override='' extra="title">
            <span url="{{../url}}" extra="title">{{ returned_location }}</span>
        </div>

        <div class="cqz-weather-holder">
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
        </div>

        {{# if forecast_url}}
            <a
                href="{{ forecast_url }}"
                class="cqz-ez-btn"
                arrow="false"
                arrow-if-visible='true'
            >
                {{ local 'extended_forecast' }}
            </a>
        {{/if}}
    {{/with}}
    {{>logo}}
</div>