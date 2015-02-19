<div class="cqz-result-h1 cqz-result-padding" idx='{{ @index }}'>
  <div class="cqz-ez-title cqz-ez-portal-title" selectable=''>
      {{data.name}}
  </div>
    
  <div class="entity-portal-stories">
    {{#each data.items}}
      <div class="entity-portal-story"
           url="{{ link }}" type="X"
           extra="entity-portal-story-{{ @index }}"
           arrow="false">
        <div class="entity-portal-story-image" style="background-image: url({{ thumbnail }})"></div>
        <div class="entity-portal-story-description cqz-vert-center" >
          <div class="entity-portal-story-title" selectable=''>
            {{ title }}
          </div>
        </div>
      </div>
    {{/each}}
  </div>
  {{> EZ-category }}
  {{>logo}}
  {{>feedback}}
</div>