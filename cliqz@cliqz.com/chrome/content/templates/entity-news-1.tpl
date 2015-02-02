<div class="cqz-result-h1 cqz-result-padding">
  <div class="cqz-ez-title cqz-ez-news-title">
      {{data.name}}
  </div>
  <div class="entity-news-stories">
    {{#each data.news}}
      <div class="entity-news-story"
           url="{{ url }}" type="X" extra="news-{{ @index }}">
        <div class="entity-news-story-image"
          style="background-image: url({{ thumbnail }})">
        </div>
        <div class="entity-news-story-description cqz-vert-center">
          <div class="entity-news-story-title">
            {{ title }}
          </div>
          <div class="entity-news-story-time">
            {{ time }}
          </div>
        </div>
      </div>
    {{/each}}
  </div>
  {{> EZ-category }}
</div>