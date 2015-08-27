<div class="{{#ifpref 'share_location' 'no'}}cqz-result-h2{{else}}cqz-result-h1{{/ifpref}} cqz-result-padding local-cinema-result local-cinema-result">
    {{#with data}}
        <div class='cqz-cinema-container'>
            <div class='cqz-cinema-image'>
                <img src='{{ cinema.image }}' alt=""/>
            </div>
            <div class='cinema_data'>
                <div class="cinema_title cqz-ez-title"><a href="{{url}}">{{ emphasis title text 2 true }}</a></div>
                <div class="cqz-result-url cinema_url">{{emphasis friendly_url text 2 true}}</div>
                <div class="cinema_description cqz-multy-lines-ellipses cqz-line-vis-3">
                    <p>
              <span>
                {{#for 0 cinema.rating 1}}
                    <span class='cqz-rating-star-on'>★</span>
                {{/for}}
                  {{#for cinema.rating 5 1}}
                      <span class='cqz-rating-star-off'>★</span>
                  {{/for}}
              </span>
              <span class="cinema_desc">
                  {{description}}
              </span>
                    </p>
                </div>
            </div>
        </div>
        <div class="cinema-showtimes-container local-sc-data-container" id="cinema-showtimes-container">
            {{#if no_location }}
                {{#unlesspref 'share_location' 'no'}}
                    {{>missing_location}}
                {{/unlesspref}}
            {{else}}
                {{#if movies }}
                    {{> partials/timetable-movie }}
                {{else}}
                    {{local 'no_cinemas_to_show'}}
                {{/if}}
            {{/if}}
        </div>
        {{#if cinema.trailer_url}}
            <div
                    arrow-override=''
                    class="cqz-ez-btn cinema-trailer-btn {{ ../../logo.buttonsClass }}"
                    url="{{ cinema.trailer_url }}">
                {{local 'cqz_watch_trailer'}}
            </div>
        {{/if}}
    {{/with}}

    {{>logo}}
</div>
