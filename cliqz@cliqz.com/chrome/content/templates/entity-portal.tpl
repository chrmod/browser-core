<div class="cqz-result-h1 ez-news cqz-result-padding">
  <div class="cqz-ez-title" selectable='' extra="title"><a href="{{url}}">{{ emphasis data.name text 2 true }}</a></div>
  <div class="entity-stories">
    {{#each data.news}}
      <div class="entity-story"
           url="{{ url }}"
           extra="entry-{{ @index }}"
           arrow="false">
        <div class="entity-story-image cqz-image-round" style="background-image: url({{ thumbnail }})"></div>
        <div class="entity-story-description">
          <div class="entity-story-title"><a href="{{url}}">{{ title }}</a></div>
          <div class="entity-story-comment">{{ time }}</div>
        </div>
      </div>
    {{/each}}
  </div>
  {{>EZ-category}}
  {{>logo}}
  {{>feedback}}
</div>
