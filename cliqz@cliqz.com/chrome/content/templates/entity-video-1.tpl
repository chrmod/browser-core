<div class="cqz-result-h1 cqz-result-padding">
  <div class="cqz-ez-title cqz-ez-video-title">
      {{data.name}}
  </div>
  {{> EZ-category }}
  <div class="entity-video-stories">
    {{#each data.items}}
      <div class="entity-video-story"
           url="{{ link }}" type="X" extra="entity-video-story-{{ @index }}">
        <div class="entity-video-story-image"
          style="background-image: url({{ thumbnail }})">
           {{#if (sec_to_duration duration)}}
               <span> {{ sec_to_duration duration}}</span>
           {{/if}}
        </div>
        <div class="entity-video-story-description cqz-vert-center">
          <div class="entity-video-story-title">
            {{ title }}
          </div>
          {{#if (local_number views )}}
            <div class="entity-video-story-time">
              {{ local_number views }} views
            </div>
          {{/if}}
        </div>
      </div>
    {{/each}}
  </div>
</div>