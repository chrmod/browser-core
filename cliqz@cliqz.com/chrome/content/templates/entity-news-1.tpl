<div class="cqz-result-h1 ez-news ez-news-toggle cqz-result-padding">
  <div class="cqz-ez-title" selectable='' extra="title"><a href="{{url}}" extra="title">{{ emphasis data.name text 2 true }}</a></div>
  <span class="cqz-ez-subtitle"  extra="url">
    {{ emphasis urlDetails.friendly_url text 2 true }}
  </span>

  <input type="radio" id="actual" class="latest" name="news-switcher"
    {{#if (isLatest data)}}
      checked="checked"
    {{/if}}
  />
  <div class="entity-stories latest">
    {{#each data.news}}
      <div class="entity-story"
           url="{{ url }}"
           extra="entry-{{ @index }}"
           arrow="false">
        <div class="entity-story-image cqz-image-round" style="background-image: url({{ thumbnail }})"></div>
        <div class="entity-story-description">
          <div class="entity-story-title"><a href="{{url}}">{{ title }}</a></div>
          <div class="entity-story-comment">
            {{ time }}
          </div>
        </div>
      </div>
    {{/each}}
  </div>

  <input type="radio" id="trends" class="trends" name="news-switcher"
    {{#unless (isLatest data)}}
      checked="checked"
    {{/unless}}
  />
  <div class="entity-stories trends">
    {{#each data.trending}}
      <div class="entity-story"
           url="{{ url }}"
           extra="entry-{{ @index }}"
           arrow="false">
        <div class="entity-story-image cqz-image-round" style="background-image: url({{ thumbnail }})"></div>
        <div class="entity-story-description">
          <div class="entity-story-title"><a href="{{url}}">{{ title }}</a></div>
          <div class="entity-story-comment">
            {{ time }}
            <div class="twitter-likes">{{ tweet_count }}</div>
          </div>
        </div>
      </div>
    {{/each}}
  </div>

  {{#if (logic (pref 'news-toggle') '&&' data.trending)}}
    <div class="switcher" cliqz-action="news-toggle" data-subType="{{data.subType}}">
      <label for="actual" class="latest">{{local 'newsToggleLatest'}}</label>
      <label for="trends" class="trends">{{local 'newsToggleTrends'}}</label>
    </div>
  {{/if}}

  {{>EZ-category}}
  {{>logo}}

</div>
