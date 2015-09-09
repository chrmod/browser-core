<div class="{{#ifpref 'share_location' 'no'}}cqz-result-h2{{else}}cqz-result-h1{{/ifpref}} cqz-result-padding local-cinema-result local-movie-result">
    {{#with data}}
        <div class='cqz-cinema-container'>
            <div class='cinema_data'>
                <div class="cinema_title cqz-ez-title"><a extra="cinemaSC_title" href="{{url}}">{{ emphasis cinema.name text 2 true }}</a></div>
                <div class="cqz-result-url cinema_url">{{emphasis friendly_url text 2 true}}</div>
                <div class="cinema_description cqz-multy-lines-ellipses cqz-line-vis-3">
                    <p>
                        <span>
                          {{#if cinema.rating}}
                            {{#for 0 cinema.rating 1}}
                              <span class='cqz-rating-star-on'>★</span>
                            {{/for}}
                            {{#for cinema.rating 5 1}}
                              <span class='cqz-rating-star-off'>★</span>
                            {{/for}}
                          {{else}}
                            {{#for 0 5 1}}
                              <span class='cqz-rating-star-off'>★</span>
                            {{/for}}
                          {{/if}}
                        </span>
                        <span class="movie_desc">
                              {{cinema.desc}}
                        </span>
                    </p>
                </div>
            </div>
        </div>
        <div id="cinema-showtimes-container" class="cinema-showtimes-container local-sc-data-container">
            {{#if no_location }}
                {{#unlesspref 'share_location' 'no'}}
                    {{> missing_location}}
                {{/unlesspref}}
            {{else}}
                {{> partials/timetable-movie }}
            {{/if}}
        </div>
        <p>
            <a xmlns="http://www.w3.org/1999/xhtml" arrow-override=""
                 class="cqz-ez-btn cqz-cinema-program-btn"
                 url="{{ cinema.cinepass_url }}"
                 extra="cinemaSC_program"
            >
                {{local 'cinema_program_btn'}}
            </a>
        </p>
    {{/with}}

    {{>logo}}
</div>
