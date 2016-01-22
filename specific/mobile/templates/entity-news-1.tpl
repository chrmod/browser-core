<!-- entity-news-1 -->
  <div class="meta">
      {{> logo}}
      <h3 class="meta__url">
          <a href="{{url}}">{{ emphasis data.name text 2 true }}</a></h3>
  </div>

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
              <img src="http://cdn.cliqz.com/extension/EZ/cliqz/EZ-social-twitter.svg"> {{tweet_count}}
            </span>
          {{/if}}
          
          {{time}}
          
        </span>  
      </h1>
    </div>

    {{!--<p class="main__content">{{ emphasis data.description text 2 true }}</p> --}}

  {{/each}}
  </div>

  {{>EZ-category}}
