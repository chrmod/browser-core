<div class='cqz-result-h3 cqz-result-pattern'>
      <div class='cqz-ez-title cliqz-pattern-title cliqz-pattern-title-h3 overflow'>
          {{ data.title }}
      </div>
      <div class='cliqz-pattern'>
        {{#each data.urls}}
        <div class='cliqz-pattern-element overflow'
            {{#if favicon }}
             style='background-image: url({{ favicon }})'
             {{else}}
              style='padding-left: 0px;'
             {{/if}}
             url='{{href}}' shortUrl='{{link}}'
             domain='{{domain}}'
             extra='{{extra}}'
             arrow="false">
            <div class='cliqz-pattern-element-title'>{{ title }}</div>
            <div class='cliqz-pattern-element-link'>{{ link }}</div>
        </div>
        {{/each}}
    </div>
    {{>logo}}
</div>
