<div class="cqz-result-h1 ez-news cqz-result-padding">
  <div class="cqz-ez-title" selectable=''>{{data.name}}</div>
  <div class="entity-stories">
    {{#each data.news}}
      <div class="entity-story"
           url="{{ url }}"
           extra="entry-{{ @index }}"
           arrow="false">
        <div class="entity-story-image cqz-image-round" style="background-image: url({{ thumbnail }})"></div>
        <div class="entity-story-description">
          <div class="entity-story-title" selectable=''>{{ title }}</div>
          <div class="entity-story-comment">{{ time }}</div>
        </div>
      </div>
    {{/each}}
  </div>
  {{>EZ-category}}
  {{>logo}}
  {{>feedback}}
</div>