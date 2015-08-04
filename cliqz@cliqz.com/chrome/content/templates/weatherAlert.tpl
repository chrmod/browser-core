<div class="cqz-result-h1 nopadding ez-weather">
    {{#with data}}
        {{#with alert}}
            <div class="alert" style="background-color:{{alert-color}}">
                <div class="header">{{des}}</div>
                <div class="info">{{time}}</div>
            </div>
        {{/with}}

        <div class="cqz-result-h2">
            <div class='cqz-ez-title cqz-ez-black-title' arrow-override='' extra="title">
                <span url="{{../url}}" extra="title">{{ returned_location }}</span>
            </div>
            <div class="cqz-weather-holder">
                <div class="EZ-weather-info-sec">
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
        </div>
    {{/with}}
    {{>logo}}
</div>
