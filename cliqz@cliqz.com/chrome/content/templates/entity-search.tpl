<div class="entity-search-container">
  <!--
  <div class="entity-search-aktuell">
    Aktuell: <span>Ebola</span> <span>Apple Inc.</span> <span>Police</span>
             <span>Tropical cyclones</span> <span>Vladimir Putin</span>
  </div>
  -->
  <div>
    <div class="entity-search-box">
      <img id="entity-search-box-icon" src="{{data.search_box_icon}}" />
      <input dont-close="true" type="text" id="entity-search-box-input"
       search-url="{{data.search_url}}" search-provider="{{data.search_provider}}"
       logg-action-type="{{data.logg_action_type}}"
       onkeydown="CLIQZ.UI.entitySearchKeyDown(event, this.value, this)"/>
    </div>
  </div>
  <div>
    {{#each data.links}}
      <div class="entity-search-container-app" style="background-color: {{this.background_color_icon}}"
           url="{{this.url}}" type="X" extra="entity-search-{{this.logg_as}}">
        <div><img src="{{this.icon_url}}"/></div>
        <div class="entity-search-container-app-text" style="background-color: {{this.background_color_text}};">{{this.text}}</div>
      </div>
    {{/each}}
  </div>
</div>
