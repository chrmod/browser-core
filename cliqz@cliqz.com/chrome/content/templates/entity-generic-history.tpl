<div class='cqz-result-h2 cqz-result-pattern'>
  <div class="cqz-ez-title cliqz-pattern-title-h2 overflow" selectable=''>
        {{ data.name }}
  </div>
  <div class='cliqz-pattern-results'>
    {{#each data.urls}}
    <div class='cliqz-pattern-element overflow'
        {{#if favicon }}
         style='background-image: url({{ favicon }}'
         {{else}}
          style='padding-left: 0px;'
         {{/if}}
         url='{{href}}' shortUrl='{{link}}'
         domain='{{domain}}' height='{{height}}'
        arrow="false">
        <div class='cliqz-pattern-element-title' selectable=''>{{ title }}</div>
        <div class='cliqz-pattern-element-link'>{{ link }}</div>
    </div>
    {{/each}}
  </div>
  <div class="cqz-ez-btns overflow">
  {{#each data.actions}}
    <div class="cqz-ez-btn"
         style="background-color: {{ ../logo/backgroundColor }}"
         url="{{ url }}" arrow="false" selectable=''>
      {{ title }}
    </div>
  {{/each}}
  </div>
  {{>feedback}}
  {{>logo}}
</div>