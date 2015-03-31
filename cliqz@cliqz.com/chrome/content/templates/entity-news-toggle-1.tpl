<div class="cqz-result-h1 ez-news ez-news-toggle cqz-result-padding">
  <div class="cqz-ez-title" selectable=''>{{ emphasis data.name text 2 true }}</div>

  <input type="radio" id="actual" class="latest" name="news-switcher" checked="checked" />
  <div class="entity-stories latest">
    {{#each data.news.Latest}}
      <div class="entity-story"
           url="{{ url }}"
           extra="entry-{{ @index }}"
           arrow="false">
        <div class="entity-story-image cqz-image-round" style="background-image: url({{ thumbnail }})"></div>
        <div class="entity-story-description">
          <div class="entity-story-title">{{ title }}</div>
          <div class="entity-story-comment">{{ time }}</div>
        </div>
      </div>
    {{/each}}
  </div>

  <input type="radio" id="trends" class="trends" name="news-switcher" />
  <div class="entity-stories trends">
    {{#each data.news.Trending}}
      <div class="entity-story"
           url="{{ url }}"
           extra="entry-{{ @index }}"
           arrow="false">
        <div class="entity-story-image cqz-image-round" style="background-image: url({{ thumbnail }})"></div>
        <div class="entity-story-description">
          <div class="entity-story-title">{{ title }}</div>
          <div class="entity-story-comment">{{ time }}</div>
        </div>
      </div>
    {{/each}}
  </div>

  <div class="switcher" cliqz-action="stop-click-event-propagation">
    <label for="actual" class="latest">Aktuell</label>
    <label for="trends" class="trends">Trends</label>
  </div>

  {{>EZ-category}}
  {{>logo}}
  {{>feedback}}
</div>