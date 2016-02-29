<!-- entity-news-1 -->
{{#with logo}}
	<div class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
 {{/with}}

<section class="primary">

    <h1 class="card__title">
       <a href="{{url}}">{{ emphasis data.name text 2 true }}</a>
    </h1>

    <div class="primary card__description">
        <div class="main mulitple">
          {{#each data.news}}
            <div class="item">
              <div class="main__image" data-style="background-image: url({{#if thumbnail}}{{ thumbnail }}{{else}}http://cdn.cliqz.com/extension/EZ/news/no-image-mobile.png{{/if}});">
                  Image
              </div>
              <h1 class="main__headline">
                <a href="{{url}}">{{ title }}</a>
                <span>
                  {{#if tweet_count}}
                    <span class="tweet_count">
                      <img data-src="http://cdn.cliqz.com/extension/EZ/cliqz/EZ-social-twitter.svg"> {{tweet_count}}
                    </span>
                  {{/if}}
                  {{time}}
                </span>  
              </h1>
            </div>
          {{/each}}
        </div>
    </div>
</section>


