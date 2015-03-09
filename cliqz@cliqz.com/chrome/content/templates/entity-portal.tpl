<!-- Resize to include history -->
<div
  {{#if data.urls}}
    class="cqz-result-h1 ez-portal cqz-result-padding cqz-result-pattern"
  {{else}}
    class="cqz-result-h2 ez-portal cqz-result-padding cqz-result-pattern"
  {{/if}}
>
  <div class="cqz-ez-title">{{data.name}}</div>

  <div class="entity-portal-stories">
    {{#each data.items}}
      <div class="entity-portal-story"
           url="{{ link }}"
           extra="entry-{{ @index }}"
           arrow="false">
        <div class="entity-portal-story-image" style="background-image: url({{ thumbnail }})"></div>
        <div class="entity-portal-story-description" >
          <div class="entity-portal-story-title">{{ title }}</div>
        </div>
      </div>
    {{/each}}
  </div>
  {{>EZ-category}}
  {{>EZ-history}}
  {{>logo}}
  {{>feedback}}
</div>