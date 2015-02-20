<div class="cqz-result-h1 cqz-result-padding ez-video">
  <div class="cqz-ez-title" selectable=''>{{data.name}}</div>
  <div class="entity-stories">
    {{#each data.items}}
      <div class="entity-story"
           url="{{ link }}" type="X"
           extra="entity-video-story-{{ @index }}"
           arrow="false">
        <div class="entity-story-image" style="background-image: url({{ thumbnail }})">
           {{#if (sec_to_duration duration)}}<span> {{ sec_to_duration duration}}</span>{{/if}}
        </div>
        <div class="entity-story-description" >
          <div class="entity-story-title" selectable=''>{{ title }}</div>
          {{#if (local_number views )}} <div class="entity-story-comment">{{ local_number views }} views</div> {{/if}}
        </div>
      </div>
    {{/each}}
  </div>
  {{>EZ-category}}
  {{>logo}}
  {{>feedback}}
</div>