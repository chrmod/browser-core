<!-- entity-search-1.tpl -->
<div
  {{#if data.urls}}
    class="cqz-result-h1 cqz-result-padding"
  {{else}}
    class="cqz-result-h2 cqz-result-padding"
  {{/if}}
>
  <div class="cqz-ez-title cqz-ez-search-title">
    <a href="{{url}}">{{data.search_provider}}</a>
  </div>

  <div class="cqz-ez-search-app-box">
    <ul class="cta-list">
    {{#each data.links}}
      <li
        class="cqz-ez-search-app transition"
        style="background-color: {{this.background_color_icon}};"
        url="{{this.url}}"
        extra="link-{{this.logg_as}}"
        ><span class="cta__logo image" style="background-image: url({{this.icon_url}})">Icon</span>
            <a>{{this.text}}</a>
      </li>
    {{/each}}
  </ul>
  </div>
  {{>EZ-history}}
</div>
<!-- end entity-search-1.tpl -->