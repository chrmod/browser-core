<div class='cqz-result-{{data.height}} cqz-result-pattern'>
      <div class='cqz-ez-title cliqz-pattern-title-{{data.height}} overflow' selectable=''>
          {{ data.title }}
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
    {{>logo}}
</div>