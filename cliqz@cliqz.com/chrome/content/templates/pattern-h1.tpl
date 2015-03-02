<div class='cqz-result-h1 cqz-result-pattern'>
      <div class='cqz-ez-title cliqz-pattern-title cliqz-pattern-title-h1 overflow'>
          {{ data.title }}
      </div>
      <div>
        {{#each data.urls}}
        <div class='cliqz-pattern-element overflow'
            {{#if favicon }}
             style='background-image: url({{ favicon }})'
             {{else}}
              style='padding-left: 0px;'
             {{/if}}
             url='{{href}}' shortUrl='{{link}}'
             extra='{{extra}}'
             domain='{{domain}}'
             arrow="false">
            <div class='cliqz-pattern-element-title' selectable=''>{{ title }}</div>
            <div class='cliqz-pattern-element-link'>{{ link }}</div>
        </div>
        {{/each}}
    </div>
    {{>logo}}
</div>
