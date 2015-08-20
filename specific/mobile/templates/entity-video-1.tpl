<div class="cqz-result-h1 cqz-result-padding ez-video">
  <div class="cqz-ez-title"><a href="{{url}}">{{data.name}}{{#if data.name_cat }} - {{ local data.name_cat }} {{/if}}</a></div>
  <div class="entity-stories">
    {{#each data.items}}
      <div class="entity-story"
           url="{{ link }}"
           extra="entry-{{ @index }}"
           arrow="false">
        <div class="entity-story-image" style="background-image: url({{ thumbnail }})">
           {{#if (sec_to_duration duration)}}<span> {{ sec_to_duration duration}}</span>{{/if}}
        </div>
        <div class="entity-story-description" >
          <div class="entity-story-title"><a href="{{link}}">{{ title }}</a></div>
          <div class="entity-story-comment">{{ views_helper views}}</div>
        </div>
      </div>
    {{/each}}
  </div>
  {{>EZ-category}}
  {{>logo}}
  {{>feedback}}
</div>
