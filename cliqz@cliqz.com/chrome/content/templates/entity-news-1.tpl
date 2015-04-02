<div class="cqz-result-h1 ez-news ez-news-toggle cqz-result-padding">
  <div class="cqz-ez-title" selectable=''>{{ emphasis data.name text 2 true }}</div>

  <input type="radio" id="actual" class="latest" name="news-switcher"
    {{#unless (isTrending data.domain)}}
      checked="checked"
    {{/unless}}
  />
  <div class="entity-stories latest">
    {{#each data.news}}
      <div class="entity-story"
           url="{{ url }}"
           extra="entry-{{ @index }}"
           arrow="false">
        <div class="entity-story-image cqz-image-round" style="background-image: url({{ thumbnail }})"></div>
        <div class="entity-story-description">
          <div class="entity-story-title">{{ title }}</div>
          <div class="entity-story-comment">
            {{ time }}            
          </div>
        </div>
      </div>
    {{/each}}
  </div>

  <input type="radio" id="trends" class="trends" name="news-switcher"
    {{#if (isTrending data.domain)}}
      checked="checked"
    {{/if}}
  />
  <div class="entity-stories trends">
    {{#each data.trending}}
      <div class="entity-story"
           url="{{ url }}"
           extra="entry-{{ @index }}"
           arrow="false">
        <div class="entity-story-image cqz-image-round" style="background-image: url({{ thumbnail }})"></div>
        <div class="entity-story-description">
          <div class="entity-story-title">{{ title }}</div>
          <div class="entity-story-comment">
            {{ time }}
            <div class="twitter-likes">{{ tweet_count }}</div>
          </div>
        </div>
      </div>
    {{/each}}
  </div>

  {{#if (pref 'news-toggle')}}
    <div class="switcher" cliqz-action="news-toggle" data-domain="{{data.domain}}">
      <label for="actual" class="latest">{{local 'newsToggleLatest'}}</label>
      <label for="trends" class="trends">{{local 'newsToggleTrends'}}</label>
    </div>
  {{/if}}

  {{>EZ-category}}
  {{>logo}}
  {{>feedback}}
</div>
