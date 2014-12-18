<div class="entity-search-container">

  <div class="entity-news-title">
    Derzeit aktuell auf
    <span class="" type="X" extra="entity-news-{{domain}}" url="{{url}}">
      {{data.domain}}
    </span>
    <img class="cliqz-logo {{ logo }}" />
  </div>
  <div class="entity-news-stories">
    {{#each data.news}}
      <div class="entity-news-story {{#if @last}} entity-news-story-last {{/if}}"
           url="{{ this.url }}" type="X" extra="entity-news-story">
        <div class="entity-news-story-image">
          <img src="{{ this.thumbnail }}" />
        </div>
        <div class="entity-news-story-description">
          <div class="entity-news-story-title">
            {{ this.title }}
          </div>
          <div class="entity-news-story-time">
            {{ this.time }}
            <span class="entity-news-story-description-text"> {{ this.description }} </span>
          </div>
        </div>
      </div>
    {{/each}}
  </div>

  <div class="entity-news-categories">
      {{#each data.categories}}
        <span url="{{ this.url }}" type="X" extra="entity-news-category">{{ this.title }}</span>
      {{/each}}
  </div>
</div>
