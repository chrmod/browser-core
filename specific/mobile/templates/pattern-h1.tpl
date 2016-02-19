<!-- pattern-h1 -->
<div class='cqz-result-h1 cqz-result-padding cqz-result-pattern'>
      <div class='cqz-ez-title cliqz-pattern-title-h1 overflow'>
          {{ data.title }}
      </div>
      <div class='cliqz-pattern'>
        {{#each data.urls}}
        {{link}}
        <div class='cliqz-pattern-element overflow'
             url='{{href}}' shortUrl='{{link}}'
             extra='{{extra}}'
             domain='{{domain}}'
             arrow="false">
            <div class='cliqz-pattern-element-title'>{{ title }}</div>
            <div class='cliqz-pattern-element-link'>{{ link }}</div>

            {{#with logo}}
                <div
                    newtab='true'
                    class='cliqz-brand-logo
                           cliqz-history-logo
                           transition'
                    {{#if add_logo_url}}
                        url="{{logo_url}}"
                    {{/if}}
                    style="{{ style }};"
                >
                    {{ text }}
                </div>
            {{/with}}
        </div>
        {{/each}}
    </div>
</div>
