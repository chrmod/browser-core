<div class="{{#ifpref 'location_never_ask'}}cqz-result-h2{{else}}cqz-result-h1{{/ifpref}} cqz-result-padding local-movie-result">
  {{#with data}}
    <div class='movie_container'>
      <div class='movie_poster'>
        <img src='{{movie.poster_img}}' class='movie_poster_img'/>
      </div>
      <div class='movie_data'>
        <div class="movie_title cqz-ez-title"><a href="{{url}}">{{ emphasis movie.name text 2 true }}</a></div>
        <div class="cqz-result-url movie_url">{{emphasis friendly_url text 2 true}}</div>
        <div class="movie_description">
          <span>
            {{#for 0 movie.rating 1}}
              <span class='cqz-rating-star-on'>★</span>
            {{/for}}
            {{#for movie.rating 5 1}}
              <span class='cqz-rating-star-off'>★</span>
            {{/for}}
          </span>
          <span class="movie_desc">
            {{movie.description}}
          </span>

        </div>
      </div>
    </div>
    <div class="cinema-showtimes-container" id="cinema-showtimes-container">
      {{#if no_location }}
        {{#unlesspref 'location_never_ask'}}
          {{>missing_location}}
        {{/unlesspref}}
      {{else}}
        {{>cinema_showtimes_partial}}
      {{/if}}
    </div>
    {{#if movie.trailer_url}}
      <div
        arrow-override=''
        class="cqz-ez-btn movie-trailer-btn {{ ../../logo.buttonsClass }}"
        url="{{ movie.trailer_url }}">
         {{local 'cqz_watch_trailer'}}
      </div>
    {{/if}}
  {{/with}}


  {{>logo}}
  {{>feedback}}
</div>
