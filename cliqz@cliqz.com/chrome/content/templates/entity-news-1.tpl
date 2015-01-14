<div class="cqz-result-h1 cqz-result-padding">
  <div class="cqz-ez-title cqz-ez-news-title">
      {{data.domain}}
  </div>
  <div class='cqz-ez-btns'>
      {{#each data.categories}}
        <span
          class="cqz-ez-btn"
          style="background-color: #EFEFEF; color: black"
          url="{{ this.url }}"
          extra="entity-news-category-{{ @index }}">
          {{ this.title }}
        </span>
      {{/each}}
  </div>
  <div class="entity-news-stories">
    {{#each data.news}}
      <div class="entity-news-story"
           url="{{ this.url }}" type="X" extra="entity-news-story-{{ @index }}">
        <div class="entity-news-story-image"
          style="background-image: url({{ this.thumbnail }})">
        </div>
        <div class="entity-news-story-description cqz-vert-center">
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
  {{> logo}}
</div>
