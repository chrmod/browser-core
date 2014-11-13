<div class="entity-search-container">

  <div class="entity-news-title">
    Meistgelesen
  </div>
  <div class="entity-news-stories">
    {{#each data.news}}
      <div class="entity-news-story" url="{{ this.url }}" type="entity-news-story">
        <div class="entity-news-story-image">
          <img src="{{ this.thumbnail }}" />
        </div>
        <div class="entity-news-story-description">
          <div class="entity-news-story-title">
            {{ this.title }}
          </div>
          <div class="entity-news-story-time">
            {{ this.time }}
          </div>
        </div>
      </div>
    {{/each}}
  </div>

  <div class="entity-news-categories">
    Kategorien:
      {{#each data.categories}}
        <span url="{{ this.url }}" type="entity-news-category">{{ this.title }}</span>
      {{/each}}
  </div>
</div>
