<div class="entity-search-container">
  <!--
  <div class="entity-search-aktuell">
    Aktuell: <span>Ebola</span> <span>Apple Inc.</span> <span>Police</span>
             <span>Tropical cyclones</span> <span>Vladimir Putin</span>
  </div>
  -->
  <div>
    <div class="entity-search-box" style="border: 1px solid {{data.search_box_background_color}};">
      <img style="background-color: {{data.search_box_background_color}};" id="entity-search-box-icon" src="{{data.search_box_icon}}" />
      <input dont-close="true" type="text" id="entity-search-box-input"
      search-url="{{data.search_url}}" search-provider="{{data.search_provider}}"
      logg-action-type="{{data.logg_action_type}}"
      onkeydown="CLIQZ.UI.entitySearchKeyDown(event, this.value, this)"/>
    </div>
  </div>
  <div class="entity-video-category">
    Popular videos
  </div>
  <div class="entity-video-indented">
    {{#each data.trending}}
    <div class="entity-video-group"
         url="{{this.link}}" type="X" extra="entity-search-google-gmail">
      <div class="entity-video-thumbnail"><img src="{{this.thumbnail}}" /></div>
      <div class="entity-video-title">{{this.title}}</div>
    </div>
    {{/each}}
  </div>
</div>
