<div class="cqz-result-h1 ez-news cqz-result-padding">
  <div class="cqz-ez-title" selectable=''><a href="{{url}}">{{ emphasis data.name text 2 true }}</a></div>
  <span class="cqz-ez-subtitle">
    {{ emphasis urlDetails.domain text 2 true }}{{ emphasis urlDetails.extra text 2 true }}
  </span>
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
