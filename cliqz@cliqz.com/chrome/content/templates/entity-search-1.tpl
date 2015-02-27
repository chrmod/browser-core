<!-- Resize to include history -->
<div 
  {{#if data.urls}} 
    class="cqz-result-h1 cqz-result-padding cqz-result-pattern"
  {{else}}
    class="cqz-result-h2 cqz-result-padding cqz-result-pattern"  
  {{/if}}
>
  <div class="cqz-ez-title cqz-ez-search-title">
      {{data.search_provider}}
  </div>
  {{#unless data.no-search-box}}
    <div>
      <div class="cqz-ez-search-box"
           style="{{#with logo}}border-color: {{backgroundColor}}; background-color: {{backgroundColor}}; {{/with}}"
           >
        <input
          dont-close="true" type="text" class="cqz-ez-search-box-input"
          cliqz-action="stop-click-event-propagation"
          search-url="{{data.search_url}}"
          search-provider="{{data.search_provider}}"
          logg-action-type="{{data.logg_action_type}}"
          onkeydown="CLIQZ.UI.entitySearchKeyDown(event, this.value, this)"
        />
      </div>
    </div>
  {{/unless}}
  <div>
    {{#each data.links}}
      <div
        class="cqz-ez-search-app"
        style="background-color: {{this.background_color_icon}}; background-image: url({{this.icon_url}})"
        url="{{this.url}}"
        extra="link-{{this.logg_as}}"
        >
            {{this.text}}
      </div>
    {{/each}}
  </div>
  {{>EZ-history}}
  {{>logo}}
  {{>feedback}}
</div>