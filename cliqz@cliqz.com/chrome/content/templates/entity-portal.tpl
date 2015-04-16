<div class="cqz-result-h1 ez-news cqz-result-padding">
  <div class="cqz-ez-title" selectable=''>{{ emphasis data.name text 2 true }}</div>
  {{>EZ-category}}
  <div class="entity-stories">
    {{#each data.news}}
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

  {{>logo}}
  {{>feedback}}
</div>
