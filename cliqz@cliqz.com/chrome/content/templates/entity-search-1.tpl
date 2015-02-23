<div class="cqz-result-h2 cqz-result-padding">
  <div class="cqz-ez-title cqz-ez-search-title">
      {{data.search_provider}}
  </div>
  {{#unless data.no-search-box}}
    <div>
      <div class="cqz-ez-search-box"
           style="border: 1px solid {{data.search_box_background_color}};"
           >
        <img
          style="background-color: {{data.search_box_background_color}};"
          class="cqz-ez-search-box-icon"
          src="{{data.search_box_icon}}" />
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
        style="background-color: {{this.background_color_icon}};
                   background-image: url({{this.icon_url}})"
        url="{{this.url}}"
        extra="link-{{this.logg_as}}"
        >
            {{this.text}}
      </div>
    {{/each}}
  </div>
  {{> logo}}
  {{>feedback}}
</div>