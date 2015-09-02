<div class="{{#ifpref 'share_location' 'no'}}cqz-result-h2{{else}}cqz-result-h1{{/ifpref}} cqz-result-padding local-cinema-result local-movie-result">
    {{#with data}}
        <div class='cqz-cinema-container'>
            <div class='cinema_data'>
                <div class="cinema_title cqz-ez-title"><a href="{{url}}">{{ emphasis title text 2 true }}</a></div>
                <div class="cqz-result-url cinema_url">{{emphasis friendly_url text 2 true}}</div>
                <div class="cinema_description cqz-multy-lines-ellipses cqz-line-vis-3">
                    <p>
                        <span class="movie_desc">
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
        <p>
            <a xmlns="http://www.w3.org/1999/xhtml" arrow-override=""
                 class="cqz-ez-btn cqz-cinema-program-btn"
                 url="{{ cinema.cinepass_url }}"
            >
                {{local 'cinema_program_btn'}}
            </a>
        </p>
    {{/with}}

    {{>logo}}
</div>
